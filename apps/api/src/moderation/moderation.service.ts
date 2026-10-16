import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Interval } from "@nestjs/schedule";
import { In, Repository } from "typeorm";
import {
  AUTO_MUTE_MS,
  AUTO_MUTE_STRIKES,
  AUTO_MUTE_WINDOW_MS,
  CHAT_BLOCK_MESSAGES,
  DM_LIMITS,
  PERMANENT,
  ROOM_CHAT_LIMITS,
  checkChatRate,
  checkChatText,
  isActiveUntil,
  isStrike,
  type SentMessage,
} from "@nyl/game-core";
import { Message } from "../entities/message.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { Character } from "../entities/character.entity";
import { Report } from "../entities/report.entity";
import { ModerationAction } from "../entities/moderation-action.entity";

const ACCOUNT_AGE_HOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const BAN_CACHE_MS = 30_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChatChannel = "room" | "dm";
export type ReportResolution = "dismiss" | "hide" | "mute" | "ban";

@Injectable()
export class ModerationService {
  // In-memory per instance. With several API instances a sender gets the limit per instance;
  // move to Redis when we scale out (see the instancing issue).
  private sent = new Map<string, SentMessage[]>();
  private strikes = new Map<string, number[]>();
  private banCache = new Map<string, { until: number | null; checkedAt: number }>();

  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    @InjectRepository(DirectMessage) private dms: Repository<DirectMessage>,
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(ModerationAction) private actions: Repository<ModerationAction>,
  ) {}

  /**
   * Everything a message must pass before it's saved: not banned or muted, clean content,
   * no personal info, not flooding. Throws with a message the sender can see.
   */
  async screen(sender: Character, text: string, channel: ChatChannel): Promise<void> {
    const now = Date.now();
    if (isActiveUntil(sender.bannedUntil, now)) throw new ForbiddenException("This account is banned");
    if (isActiveUntil(sender.chatMutedUntil, now)) {
      const mins = Math.ceil((Number(sender.chatMutedUntil) - now) / 60_000);
      throw new BadRequestException(`You're muted for ${mins} more minute${mins === 1 ? "" : "s"}`);
    }

    const content = checkChatText(text);
    if (!content.ok) {
      if (isStrike(content.reason)) await this.addStrike(sender, now);
      throw new BadRequestException(CHAT_BLOCK_MESSAGES[content.reason]);
    }

    const key = `${channel}:${sender.id}`;
    const rate = checkChatRate(this.sent.get(key) ?? [], text, now, channel === "room" ? ROOM_CHAT_LIMITS : DM_LIMITS);
    this.sent.set(key, rate.history);
    if (!rate.verdict.ok) throw new BadRequestException(CHAT_BLOCK_MESSAGES[rate.verdict.reason]);
  }

  /** Async AI moderation placeholder. Returns true if safe. */
  async aiCheck(text: string): Promise<boolean> {
    // Placeholder: in production, call an AI moderation API.
    return checkChatText(text).ok;
  }

  /** Whether a character's account is young enough to need moderation hold. */
  needsHold(character: Character): boolean {
    const age = Date.now() - Number(character.createdAt);
    return age < ACCOUNT_AGE_HOLD_MS;
  }

  /** Resolve a room message after AI review. */
  async resolveMessage(messageId: string, safe: boolean) {
    await this.messages.update(messageId, { safe, visible: safe });
  }

  /** Resolve a DM after AI review. */
  async resolveDm(messageId: string, safe: boolean) {
    await this.dms.update(messageId, { safe, visible: safe });
  }

  /** For the auth guard. Cached briefly so it doesn't add a query to every request. */
  async isBanned(characterId: string): Promise<boolean> {
    // Guests without a character carry their session token as the subject: nothing to ban yet.
    if (!UUID.test(characterId)) return false;
    const now = Date.now();
    let entry = this.banCache.get(characterId);
    if (!entry || now - entry.checkedAt > BAN_CACHE_MS) {
      const c = await this.characters.findOne({ where: { id: characterId }, select: { id: true, bannedUntil: true } });
      entry = { until: c?.bannedUntil ?? null, checkedAt: now };
      this.banCache.set(characterId, entry);
    }
    return isActiveUntil(entry.until, now);
  }

  private async addStrike(sender: Character, now: number) {
    const recent = (this.strikes.get(sender.id) ?? []).filter((t) => now - t < AUTO_MUTE_WINDOW_MS);
    recent.push(now);
    this.strikes.set(sender.id, recent);
    if (recent.length < AUTO_MUTE_STRIKES) return;
    this.strikes.delete(sender.id);
    await this.mute(sender.id, AUTO_MUTE_MS / 60_000, "Automatic: repeated blocked messages", "system");
  }

  /** Drop rate-limit and strike history nobody needs anymore. */
  @Interval(5 * 60_000)
  sweep() {
    const now = Date.now();
    for (const [k, h] of this.sent) if (!h.some((m) => now - m.at < 60_000)) this.sent.delete(k);
    for (const [k, s] of this.strikes) if (!s.some((t) => now - t < AUTO_MUTE_WINDOW_MS)) this.strikes.delete(k);
    for (const [k, b] of this.banCache) if (now - b.checkedAt > BAN_CACHE_MS) this.banCache.delete(k);
  }

  // ── Moderator tools ──────────────────────────────────────────────

  async listReports(status = "pending", limit = 50) {
    const rows = await this.reports.find({ where: { status }, order: { createdAt: "ASC" }, take: Math.min(limit, 200) });
    const ids = [...new Set(rows.flatMap((r) => [r.reporterId, r.targetId]))];
    const chars = ids.length ? await this.characters.find({ where: { id: In(ids) } }) : [];
    const byId = new Map(chars.map((c) => [c.id, c]));
    const msgIds = rows.map((r) => r.messageId).filter((m): m is string => !!m);
    const [roomMsgs, dmMsgs] = msgIds.length
      ? await Promise.all([this.messages.find({ where: { id: In(msgIds) } }), this.dms.find({ where: { id: In(msgIds) } })])
      : [[], []];
    const bodies = new Map<string, { body: string; kind: ChatChannel; roomId?: string }>([
      ...roomMsgs.map((m) => [m.id, { body: m.body, kind: "room" as const, roomId: m.roomId }] as const),
      ...dmMsgs.map((m) => [m.id, { body: m.body, kind: "dm" as const }] as const),
    ]);
    const now = Date.now();
    return Promise.all(
      rows.map(async (r) => {
        const target = byId.get(r.targetId);
        return {
          ...r,
          reporterName: byId.get(r.reporterId)?.name ?? null,
          targetName: target?.name ?? null,
          targetMuted: isActiveUntil(target?.chatMutedUntil, now),
          targetBanned: isActiveUntil(target?.bannedUntil, now),
          message: r.messageId ? (bodies.get(r.messageId) ?? null) : null,
          reportsAgainstTarget: await this.reports.count({ where: { targetId: r.targetId } }),
          priorActions: await this.actions.count({ where: { targetId: r.targetId } }),
        };
      }),
    );
  }

  async resolveReport(
    reportId: string,
    resolution: ReportResolution,
    moderator: string,
    opts: { minutes?: number; note?: string } = {},
  ) {
    const report = await this.reports.findOneBy({ id: reportId });
    if (!report) throw new NotFoundException("Report not found");
    if (report.status !== "pending") throw new BadRequestException(`Report already ${report.status}`);
    const note = opts.note ?? `Report: ${report.reason}`;

    if (resolution === "dismiss") {
      await this.log(report.targetId, "dismiss_report", note, moderator, { reportId });
      await this.reports.update(reportId, { status: "dismissed" });
      return { status: "dismissed" };
    }

    if (report.messageId) await this.hideMessage(report.messageId, moderator, note, reportId);
    if (resolution === "mute") await this.mute(report.targetId, requireMinutes(opts.minutes), note, moderator, reportId);
    if (resolution === "ban") await this.ban(report.targetId, opts.minutes, note, moderator, reportId);
    await this.reports.update(reportId, { status: "actioned" });
    return { status: "actioned" };
  }

  async mute(targetId: string, minutes: number, reason: string, actor: string, reportId?: string) {
    await this.requireCharacter(targetId);
    const until = Date.now() + requireMinutes(minutes) * 60_000;
    await this.characters.update(targetId, { chatMutedUntil: until });
    await this.log(targetId, "mute", reason, actor, { reportId, until });
    return { chatMutedUntil: until };
  }

  async unmute(targetId: string, reason: string | undefined, actor: string) {
    await this.requireCharacter(targetId);
    await this.characters.update(targetId, { chatMutedUntil: null });
    await this.log(targetId, "unmute", reason ?? null, actor);
    return { chatMutedUntil: null };
  }

  /** No minutes = permanent. */
  async ban(targetId: string, minutes: number | undefined, reason: string, actor: string, reportId?: string) {
    await this.requireCharacter(targetId);
    const until = minutes == null ? PERMANENT : Date.now() + requireMinutes(minutes) * 60_000;
    await this.characters.update(targetId, { bannedUntil: until });
    this.banCache.delete(targetId);
    await this.log(targetId, "ban", reason, actor, { reportId, until });
    return { bannedUntil: until === PERMANENT ? "permanent" : until };
  }

  async unban(targetId: string, reason: string | undefined, actor: string) {
    await this.requireCharacter(targetId);
    await this.characters.update(targetId, { bannedUntil: null });
    this.banCache.delete(targetId);
    await this.log(targetId, "unban", reason ?? null, actor);
    return { bannedUntil: null };
  }

  /** Hides a room message or DM from everyone. */
  async hideMessage(messageId: string, actor: string, reason?: string, reportId?: string) {
    const room = await this.messages.findOneBy({ id: messageId });
    const dm = room ? null : await this.dms.findOneBy({ id: messageId });
    const msg = room ?? dm;
    if (!msg) throw new NotFoundException("Message not found");
    if (room) await this.messages.update(messageId, { visible: false, safe: false });
    else await this.dms.update(messageId, { visible: false, safe: false });
    const targetId = room ? room.characterId : dm!.senderId;
    await this.log(targetId, "hide_message", reason ?? null, actor, { reportId, messageId });
    return { hidden: true };
  }

  async history(targetId: string) {
    const c = await this.requireCharacter(targetId);
    const now = Date.now();
    const bannedUntil = c.bannedUntil == null ? null : Number(c.bannedUntil);
    return {
      characterId: c.id,
      name: c.name,
      chatMutedUntil: isActiveUntil(c.chatMutedUntil, now) ? Number(c.chatMutedUntil) : null,
      bannedUntil: !isActiveUntil(bannedUntil, now) ? null : bannedUntil === PERMANENT ? "permanent" : bannedUntil,
      reports: await this.reports.find({ where: { targetId }, order: { createdAt: "DESC" }, take: 50 }),
      actions: await this.actions.find({ where: { targetId }, order: { createdAt: "DESC" }, take: 100 }),
    };
  }

  private async requireCharacter(id: string) {
    const c = await this.characters.findOneBy({ id });
    if (!c) throw new NotFoundException("Character not found");
    return c;
  }

  private async log(
    targetId: string,
    action: string,
    reason: string | null,
    actor: string,
    extra: { reportId?: string; messageId?: string; until?: number } = {},
  ) {
    await this.actions.save({
      targetId,
      action,
      reason,
      actor,
      reportId: extra.reportId ?? null,
      messageId: extra.messageId ?? null,
      until: extra.until ?? null,
    });
  }
}

function requireMinutes(minutes: number | undefined): number {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0 || minutes > 525_600) {
    throw new BadRequestException("minutes must be between 1 and 525600");
  }
  return Math.ceil(minutes);
}
