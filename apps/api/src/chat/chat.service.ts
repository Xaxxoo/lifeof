import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Character } from "../entities/character.entity";
import { Message } from "../entities/message.entity";

const MAX_LEN = 140;
const BLOCKED = [/\bn[i1]gg/i, /\bf[a@]gg?[o0]t/i, /\bk[i1]ke\b/i, /\bch[i1]nk\b/i];

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Message) private messages: Repository<Message>,
  ) {}

  async say(token: string, roomId: string, body: string) {
    const c = await this.requireByToken(token);
    const text = body.trim().slice(0, MAX_LEN);
    if (!text) return;
    if (BLOCKED.some((r) => r.test(text))) throw new BadRequestException("That message can't be sent");
    await this.messages.save({ roomId, characterId: c.id, name: c.name, body: text });
  }

  async recent(roomId: string) {
    const rows = await this.messages.find({
      where: { roomId },
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
