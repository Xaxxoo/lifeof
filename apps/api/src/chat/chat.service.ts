import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Character } from "../entities/character.entity";
import { Message } from "../entities/message.entity";
import { ModerationService } from "../moderation/moderation.service";

const MAX_LEN = 140;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Message) private messages: Repository<Message>,
    private moderation: ModerationService,
  ) {}

  async say(token: string, roomId: string, body: string): Promise<Message | null> {
    const c = await this.requireByToken(token);
    const text = body.trim().slice(0, MAX_LEN);
    if (!text) return null;

    // Expanded regex filter
    if (!this.moderation.localCheck(text)) {
      throw new BadRequestException("That message can't be sent");
    }

    const needsHold = this.moderation.needsHold(c);
    const msg = await this.messages.save({
      roomId,
      characterId: c.id,
      name: c.name,
      body: text,
      safe: needsHold ? null : true,
      visible: !needsHold,
    });

    // For new accounts, run async AI check
    if (needsHold) {
      this.moderation.aiCheck(text).then((safe) => {
        this.moderation.resolveMessage(msg.id, safe);
      });
    }

    return needsHold ? null : msg;
  }

  async recent(roomId: string) {
    const rows = await this.messages.find({
      where: { roomId, visible: true },
      order: { createdAt: "DESC" },
      take: 30,
    });
    return rows.reverse();
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
