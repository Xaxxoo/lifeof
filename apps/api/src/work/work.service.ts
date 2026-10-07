import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { isOpenAt, nycDateKey, nycTime, rentPeriodKey } from "@nyl/game-core";
import { AUTOPILOT_PAY_RATE, CAREERS, STUDENT_SHIFTS_PER_WEEK } from "@nyl/content";
import { Character } from "../entities/character.entity";
import { BankService } from "../bank/bank.service";

const OFFLINE_FOR_MS = 30 * 60_000;

@Injectable()
export class WorkService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    private bank: BankService,
  ) {}

  async apply(token: string, careerId: string) {
    const c = await this.requireByToken(token);
    const career = CAREERS[careerId];
    if (!career) throw new BadRequestException("Unknown career");
    if (c.job) throw new BadRequestException("Quit your current job first");
    if (c.status === "student" && !career.studentFriendly) throw new BadRequestException("Student visa: campus jobs only");
    await this.characters.update(c.id, {
      job: { careerId, level: 1, shiftsAtLevel: 0, totalShifts: 0 },
    });
    return career.levels[0]!.title;
  }

  async quit(token: string) {
    const c = await this.requireByToken(token);
    if (c.roomId === "work") throw new BadRequestException("Finish your shift first");
    await this.characters.update(c.id, { job: null });
  }

  async autopilotTick() {
    const now = Date.now();
    const t = nycTime(now);
    const today = nycDateKey(now);
    const period = rentPeriodKey(now);
    const cutoff = now - OFFLINE_FOR_MS;

    const away = await this.characters
      .createQueryBuilder("c")
      .where('"lastSeenAt" < :cutoff', { cutoff })
      .take(200)
      .getMany();

    for (const c of away) {
      if (!c.job || c.activity || c.roomId === "work" || c.autopilotDay === today) continue;
      const career = CAREERS[c.job.careerId];
      if (!career || !isOpenAt(career.hours, t)) continue;
      const worked = c.shiftWeek.period === period ? c.shiftWeek.count : 0;
      if (c.status === "student" && worked >= STUDENT_SHIFTS_PER_WEEK) continue;
      const level = career.levels[c.job.level - 1]!;
      const pay = Math.round(level.payPerShift * AUTOPILOT_PAY_RATE);
      await this.bank.addMoney(c.id, pay, "work:autopilot", `autopilot:${c.id}:${today}`, {
        label: `Autopilot shift as ${level.title}`,
      });
      await this.characters.update(c.id, {
        autopilotDay: today,
        shiftWeek: { period, count: worked + 1 },
        job: { ...c.job, totalShifts: c.job.totalShifts + 1 },
      });
    }
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
