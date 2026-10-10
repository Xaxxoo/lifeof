import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Character } from "../entities/character.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { SocialService } from "../social/social.service";
import { ModerationService } from "../moderation/moderation.service";
import { levelFromPoints, relationshipDecay } from "@nyl/game-core";

const MAX_DM_LEN = 500;

@Injectable()
export class DmService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(DirectMessage) private dms: Repository<DirectMessage>,
    private social: SocialService,
    private moderation: ModerationService,
  ) {}

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  async send(token: string, recipientId: string, body: string): Promise<DirectMessage> {
    const sender = await this.requireByToken(token);
    if (sender.id === recipientId) throw new BadRequestException("Can't DM yourself");

    const recipient = await this.characters.findOneBy({ id: recipientId });
    if (!recipient) throw new BadRequestException("Recipient not found");

    // Check block
    const blocked = await this.social.isBlocked(sender.id, recipientId);
    if (blocked) throw new BadRequestException("Cannot message this player");

    // Check friendship level (must be at least friend)
    const rel = await this.social.getRelationship(sender.id, recipientId);
    const decayed = relationshipDecay(rel.points, (Date.now() - Number(rel.lastInteractionAt)) / 3_600_000);
    const level = levelFromPoints(decayed);
    if (level === "stranger") throw new BadRequestException("You need to be at least acquaintance to DM");

    const text = body.trim().slice(0, MAX_DM_LEN);
    if (!text) throw new BadRequestException("Message can't be empty");

    // Moderation
    if (!this.moderation.localCheck(text)) {
      throw new BadRequestException("That message can't be sent");
    }

    const needsHold = this.moderation.needsHold(sender);
    const dm = await this.dms.save({
      senderId: sender.id,
      recipientId,
      senderName: sender.name,
      body: text,
      read: false,
      safe: needsHold ? null : true,
      visible: !needsHold,
    });

    // If held, run async AI check
    if (needsHold) {
      this.moderation.aiCheck(text).then((safe) => {
        this.moderation.resolveDm(dm.id, safe);
      });
    }

    return dm;
  }

  async threads(characterId: string) {
    // Get all DMs involving this character, grouped by partner
    const sent = await this.dms.find({
      where: { senderId: characterId, visible: true },
      order: { createdAt: "DESC" },
    });
    const received = await this.dms.find({
      where: { recipientId: characterId, visible: true },
      order: { createdAt: "DESC" },
    });

    const all = [...sent, ...received].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const threadMap = new Map<string, { partnerId: string; partnerName: string; lastMessage: string; lastAt: string; unread: number }>();

    for (const dm of all) {
      const partnerId = dm.senderId === characterId ? dm.recipientId : dm.senderId;
      if (threadMap.has(partnerId)) {
        // Count unread
        if (dm.recipientId === characterId && !dm.read) {
          threadMap.get(partnerId)!.unread++;
        }
        continue;
      }
      const partner = await this.characters.findOneBy({ id: partnerId });
      threadMap.set(partnerId, {
        partnerId,
        partnerName: partner?.name ?? "Unknown",
        lastMessage: dm.body.slice(0, 50),
        lastAt: dm.createdAt.toISOString(),
        unread: dm.recipientId === characterId && !dm.read ? 1 : 0,
      });
    }

    return Array.from(threadMap.values());
  }

  async conversation(characterId: string, partnerId: string, before?: string) {
    const query = this.dms
      .createQueryBuilder("dm")
      .where("dm.visible = true")
      .andWhere(
        "((dm.senderId = :me AND dm.recipientId = :partner) OR (dm.senderId = :partner AND dm.recipientId = :me))",
        { me: characterId, partner: partnerId },
      )
      .orderBy("dm.createdAt", "DESC")
      .take(50);

    if (before) {
      query.andWhere("dm.id < :before", { before });
    }

    const rows = await query.getMany();
    return rows.reverse();
  }

  async markRead(characterId: string, partnerId: string) {
    await this.dms.update(
      { recipientId: characterId, senderId: partnerId, read: false },
      { read: true },
    );
  }

  async unreadCount(characterId: string): Promise<number> {
    return this.dms.count({
      where: { recipientId: characterId, read: false, visible: true },
    });
  }
}
