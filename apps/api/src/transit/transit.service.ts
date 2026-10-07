import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { applyNeedDelta } from "@nyl/game-core";
import { SUBWAY_MOMENTS } from "@nyl/content";
import { Character } from "../entities/character.entity";
import { BankService } from "../bank/bank.service";
import { WorldService } from "../world/world.service";

@Injectable()
export class TransitService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    private bank: BankService,
    private world: WorldService,
  ) {}

  async tip(token: string) {
    const c = await this.requireByToken(token);
    const a = c.activity;
    if (c.roomId !== "transit" || !a || a.kind !== "ride") throw new BadRequestException("You're not on a train");
    const moment = SUBWAY_MOMENTS.find((m) => m.id === a.rideMoment);
    if (!moment?.tip) throw new BadRequestException("Nobody to tip here");
    if (a.tipped) return;
    await this.bank.addMoney(c.id, -1, "transit:tip", `tip:${a.id}`, { label: "Tipped the performers" });
    const now = Date.now();
    const city = await this.world.getCity();
    const needs = applyNeedDelta(this.world.currentNeeds(c, now, city), { fun: 6, social: 3 });
    await this.characters.update(c.id, {
      needs,
      needsUpdatedAt: now,
      activity: { ...a, tipped: true },
    });
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
