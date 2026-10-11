import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { rentPeriodKey, upsertMoodlet } from "@nyl/game-core";
import { Character } from "../entities/character.entity";
import { LedgerEntry } from "../entities/ledger-entry.entity";
import { Lease } from "../entities/lease.entity";

const LATE_FEE = 25;

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(LedgerEntry) private ledger: Repository<LedgerEntry>,
    @InjectRepository(Lease) private leases: Repository<Lease>,
  ) {}

  /**
   * The only way money moves. Writes a ledger row and the new balance atomically.
   * The same requestId never applies twice, so retries are safe.
   */
  async addMoney(
    characterId: string,
    delta: number,
    reason: string,
    requestId: string,
    opts: { label?: string; allowNegative?: boolean } = {},
  ): Promise<number> {
    const dup = await this.ledger.findOne({ where: { requestId } });
    const c = await this.characters.findOneByOrFail({ id: characterId });
    if (dup) return Number(c.cash);

    const amount = Math.round(delta);
    const balanceAfter = Number(c.cash) + amount;
    if (balanceAfter < 0 && !opts.allowNegative) throw new BadRequestException("Not enough money");

    await this.ledger.save({
      characterId,
      delta: amount,
      balanceAfter,
      reason,
      label: opts.label ?? null,
      requestId,
    });
    await this.characters.update(characterId, { cash: balanceAfter });
    return balanceAfter;
  }

  async getLedger(characterId: string) {
    return this.ledger.find({
      where: { characterId },
      order: { id: "DESC" },
      take: 30,
    });
  }

  async payRent(characterId: string) {
    const c = await this.characters.findOneByOrFail({ id: characterId });
    if (c.rent.owed <= 0) throw new BadRequestException("You don't owe any rent");
    await this.addMoney(c.id, -c.rent.owed, "rent:arrears", `arrears:${c.id}:${c.rent.lastPeriod}:${c.rent.owed}`, {
      label: "Paid rent you owed",
    });
    await this.characters.update(c.id, { rent: { ...c.rent, owed: 0, missedWeeks: 0 } });
  }

  async collectRent() {
    const now = Date.now();
    const period = rentPeriodKey(now);
    // Characters with active player-landlord leases pay via collectLandlordRent() instead
    const activeLeases = await this.leases.find({ where: { status: "active" } });
    const leaseTenantIds = new Set(activeLeases.map((l) => l.tenantId));
    const all = await this.characters.find({ take: 5000 });
    for (const c of all) {
      if (c.rent.lastPeriod === period) continue;
      if (leaseTenantIds.has(c.id)) continue;
      const due = c.rent.perWeek;
      if (Number(c.cash) >= due) {
        await this.addMoney(c.id, -due, "rent:weekly", `rent:${c.id}:${period}`, {
          label: "Weekly rent, basement room",
        });
        await this.characters.update(c.id, { rent: { ...c.rent, lastPeriod: period } });
      } else {
        await this.characters.update(c.id, {
          rent: {
            ...c.rent,
            lastPeriod: period,
            owed: c.rent.owed + due + LATE_FEE,
            missedWeeks: c.rent.missedWeeks + 1,
          },
          moodlets: upsertMoodlet(
            c.moodlets,
            { id: "landlord", label: "The landlord texted. Again.", value: -10, expiresAt: now + 24 * 3_600_000 },
            now,
          ),
        });
      }
    }
  }
}
