import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "../entities/message.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { Character } from "../entities/character.entity";

const BLOCKED_PATTERNS = [
  /\bn[i1]gg/i,
  /\bf[a@]gg?[o0]t/i,
  /\bk[i1]ke\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\bw[e3]tb[a@]ck/i,
  /\btr[a@]nn/i,
  /\br[e3]t[a@]rd/i,
  /\bk[y1]s\b/i,
  /\bkill\s*(your|ur)\s*self/i,
  /\bs[l1]ut\b/i,
  /\bwh[o0]re\b/i,
];

const ACCOUNT_AGE_HOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    @InjectRepository(DirectMessage) private dms: Repository<DirectMessage>,
    @InjectRepository(Character) private characters: Repository<Character>,
  ) {}

  /** Synchronous regex check. Returns false if blocked. */
  localCheck(text: string): boolean {
    return !BLOCKED_PATTERNS.some((r) => r.test(text));
  }

  /** Async AI moderation placeholder. Returns true if safe. */
  async aiCheck(text: string): Promise<boolean> {
    // Placeholder: in production, call an AI moderation API.
    // For now, do an extended local check.
    return this.localCheck(text);
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
}
