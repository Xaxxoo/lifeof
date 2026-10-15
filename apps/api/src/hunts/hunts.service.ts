import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Interval } from "@nestjs/schedule";
import { Repository, In } from "typeorm";
import { LAUNCH_HUNTS, PLACE_BY_ID, ROOMS, huntMemo, huntProblems, placeAt, type HuntDef } from "@nyl/content";
import { Hunt } from "../entities/hunt.entity";
import { HuntProgress, type HuntPayout } from "../entities/hunt-progress.entity";
import { BankService } from "../bank/bank.service";
import { StellarService } from "../stellar/stellar.service";
import { EventsGateway } from "../events/events.gateway";

/** After a wrong guess you wait this long before searching again, so nobody can sweep every shop on a block. */
const MISS_COOLDOWN_MS = 20_000;
const MAX_PAYOUT_ATTEMPTS = 8;

export interface HuntResult {
  huntId: string;
  huntName: string;
  outcome: "found" | "finished" | "finished-late" | "miss" | "already";
  placeName?: string;
  rank?: number | null;
  cash?: number;
  stellar?: { asset: string; amount: string } | null;
}

@Injectable()
export class HuntsService implements OnModuleInit {
  private readonly log = new Logger(HuntsService.name);
  /** characterId → last wrong search (ms). In memory: a restart just forgives a cooldown. */
  private lastMiss = new Map<string, number>();
  /** Activities already scored. The server timer and the client's finish call can both complete the same search. */
  private scored = new Map<string, number>();

  constructor(
    @InjectRepository(Hunt) private hunts: Repository<Hunt>,
    @InjectRepository(HuntProgress) private progress: Repository<HuntProgress>,
    private bank: BankService,
    private stellar: StellarService,
    @Inject(forwardRef(() => EventsGateway)) private gateway: EventsGateway,
  ) {}

  async onModuleInit() {
    for (const def of LAUNCH_HUNTS) {
      await this.hunts.createQueryBuilder().insert().values({ ...def, claimed: 0, active: true }).orIgnore().execute();
    }
  }

  private running(h: Hunt, now: number) {
    return h.active && now >= Number(h.startsAt) && now < Number(h.endsAt);
  }

  // ── Player views ────────────────────────────────────────

  /** Hunts you can join now, plus any you've joined (so finished ones still show your result). */
  async list(characterId: string) {
    const now = Date.now();
    const mine = await this.progress.find({ where: { characterId } });
    const byHunt = new Map(mine.map((p) => [p.huntId, p]));
    const all = await this.hunts.find();
    return all
      .filter((h) => this.running(h, now) || byHunt.has(h.id))
      .sort((a, b) => Number(a.endsAt) - Number(b.endsAt))
      .map((h) => this.view(h, byHunt.get(h.id) ?? null, now));
  }

  /** Never includes where the current step is: only its clue, and the places already found. */
  private view(h: Hunt, p: HuntProgress | null, now: number) {
    const done = !!p?.completedAt;
    const current = p && !done ? h.steps[p.step] : undefined;
    return {
      id: h.id,
      name: h.name,
      blurb: h.blurb,
      sponsor: h.sponsor,
      startsAt: Number(h.startsAt),
      endsAt: Number(h.endsAt),
      running: this.running(h, now),
      totalSteps: h.steps.length,
      prize: h.prize,
      supply: h.supply,
      claimed: h.claimed,
      joined: !!p,
      step: p?.step ?? 0,
      clue: current?.clue ?? null,
      found: (p ? h.steps.slice(0, p.step) : []).map((s, i) => {
        const place = PLACE_BY_ID[s.placeId];
        return { name: place?.name ?? s.placeId, neighborhood: ROOMS[place?.roomId ?? ""]?.neighborhood ?? "", at: p!.foundAt[i] ?? null };
      }),
      completedAt: p?.completedAt ? Number(p.completedAt) : null,
      rank: p?.rank ?? null,
      payout: p?.payout ? { status: p.payout.status, asset: p.payout.asset, amount: p.payout.amount, txHash: p.payout.txHash ?? null } : null,
    };
  }

  async join(characterId: string, huntId: string) {
    const h = await this.hunts.findOneBy({ id: huntId });
    if (!h || !this.running(h, Date.now())) throw new NotFoundException("That hunt isn't running");
    await this.progress
      .createQueryBuilder()
      .insert()
      .values({ characterId, huntId, step: 0, foundAt: [], joinedAt: Date.now(), completedAt: null, rank: null, payout: null })
      .orIgnore()
      .execute();
    return this.view(h, await this.progress.findOneBy({ characterId, huntId }), Date.now());
  }

  // ── Searching (called by PlayService) ───────────────────

  /** Throws a player-facing reason if you can't search here right now. */
  async assertCanSearch(characterId: string, roomId: string, target: string, now: number) {
    if (!placeAt(roomId, target)) throw new BadRequestException("Nothing to search here");
    const missAt = this.lastMiss.get(characterId);
    if (missAt && now - missAt < MISS_COOLDOWN_MS) {
      throw new BadRequestException(`Catch your breath. Search again in ${Math.ceil((MISS_COOLDOWN_MS - (now - missAt)) / 1000)}s`);
    }
    if (!(await this.activeFor(characterId, now)).length) throw new BadRequestException("Join a treasure hunt first: Phone → Hunts");
  }

  private async activeFor(characterId: string, now: number) {
    const mine = await this.progress.find({ where: { characterId } });
    const open = mine.filter((p) => !p.completedAt);
    if (!open.length) return [];
    const hunts = await this.hunts.findBy({ id: In(open.map((p) => p.huntId)) });
    const byId = new Map(hunts.map((h) => [h.id, h]));
    return open.flatMap((p) => {
      const h = byId.get(p.huntId);
      return h && this.running(h, now) ? [{ p, h }] : [];
    });
  }

  /** A search finished at roomId/target. Advances every joined hunt whose current clue is this place. */
  async onSearched(characterId: string, activityId: string, roomId: string, target: string, now: number) {
    if (this.scored.has(activityId)) return [];
    this.scored.set(activityId, now);
    for (const [id, at] of this.scored) if (now - at > 10 * 60_000) this.scored.delete(id);

    const place = placeAt(roomId, target);
    const results: HuntResult[] = [];
    let alreadyFound = false;
    if (place) {
      for (const { p, h } of await this.activeFor(characterId, now)) {
        if (h.steps.slice(0, p.step).some((s) => s.placeId === place.id)) alreadyFound = true;
        if (h.steps[p.step]?.placeId !== place.id) continue;
        results.push(await this.advance(h, p, place.name, now));
      }
    }
    if (!results.length && alreadyFound) {
      results.push({ huntId: "", huntName: "", outcome: "already", placeName: place?.name });
    } else if (!results.length) {
      this.lastMiss.set(characterId, now);
      results.push({ huntId: "", huntName: "", outcome: "miss", placeName: place?.name });
    }
    for (const r of results) this.gateway.sendToCharacter(characterId, "hunt:result", r);
    return results;
  }

  private async advance(h: Hunt, p: HuntProgress, placeName: string, now: number): Promise<HuntResult> {
    const nextStep = p.step + 1;
    // Only move forward from the step we read, so a double-submitted search can't skip or repeat one.
    const moved = await this.progress
      .createQueryBuilder()
      .update()
      .set({ step: nextStep, foundAt: () => `"foundAt" || '${JSON.stringify([now])}'::jsonb` })
      .where("id = :id AND step = :step AND \"completedAt\" IS NULL", { id: p.id, step: p.step })
      .execute();
    if (!moved.affected) return { huntId: h.id, huntName: h.name, outcome: "found", placeName };
    if (nextStep < h.steps.length) return { huntId: h.id, huntName: h.name, outcome: "found", placeName };

    // Last step: take a prize if any are left. The WHERE makes this the only place supply is enforced.
    const taken = await this.hunts
      .createQueryBuilder()
      .update()
      .set({ claimed: () => "claimed + 1" })
      .where("id = :id AND claimed < supply", { id: h.id })
      .returning("claimed")
      .execute();
    const rank: number | null = (taken.raw as { claimed: number }[])[0]?.claimed ?? null;
    const payout: HuntPayout | null =
      rank && h.prize.stellar
        ? { status: "pending", asset: h.prize.stellar.asset, amount: h.prize.stellar.amount, memo: huntMemo(h.id, rank), attempts: 0 }
        : null;
    await this.progress.update(p.id, { completedAt: now, rank, payout });

    if (!rank) return { huntId: h.id, huntName: h.name, outcome: "finished-late", placeName, rank: null };

    if (h.prize.cash > 0) {
      await this.bank.addMoney(p.characterId, h.prize.cash, "hunt:prize", `hunt:${h.id}:prize:${p.characterId}`, {
        label: `Treasure hunt prize: ${h.name}`,
      });
    }
    if (payout) void this.payOut(p.id);
    return { huntId: h.id, huntName: h.name, outcome: "finished", placeName, rank, cash: h.prize.cash, stellar: h.prize.stellar ?? null };
  }

  // ── Stellar payouts ─────────────────────────────────────

  private async payOut(progressId: string) {
    const p = await this.progress.findOneBy({ id: progressId });
    if (!p?.payout || p.payout.status !== "pending") return;
    const attempt = p.payout.attempts + 1;
    try {
      const { txHash } = await this.stellar.sendReward(p.characterId, p.payout.asset, p.payout.amount, p.payout.memo);
      await this.progress.update(p.id, { payout: { ...p.payout, status: "paid", attempts: attempt, txHash, error: undefined } });
      this.gateway.sendToCharacter(p.characterId, "hunt:paid", { huntId: p.huntId, txHash, asset: p.payout.asset, amount: p.payout.amount });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.log.warn(`Payout ${p.payout.memo} attempt ${attempt} failed: ${error}`);
      await this.progress.update(p.id, {
        payout: { ...p.payout, attempts: attempt, error, status: attempt >= MAX_PAYOUT_ATTEMPTS ? "failed" : "pending" },
      });
    }
  }

  /** Retry pending prize payments (treasury was empty, Horizon hiccup, wallet still funding). */
  @Interval(60_000)
  async retryPayouts() {
    if (!this.stellar.treasuryConfigured) return;
    const pending = await this.progress
      .createQueryBuilder("p")
      .where(`p.payout ->> 'status' = 'pending'`)
      .orderBy("p.completedAt", "ASC")
      .limit(20)
      .getMany();
    for (const p of pending) await this.payOut(p.id);
  }

  // ── Admin (partners launching campaigns) ────────────────

  async upsertCampaign(def: HuntDef) {
    const problems = huntProblems(def);
    if (problems.length) throw new BadRequestException(problems);
    const existing = await this.hunts.findOneBy({ id: def.id });
    if (existing) {
      // Once players are in, the route and the supply are fixed: changing them would strand progress.
      const started = await this.progress.countBy({ huntId: def.id });
      if (started && JSON.stringify(existing.steps) !== JSON.stringify(def.steps)) throw new BadRequestException("Players have started; steps can't change");
      if (def.supply < existing.claimed) throw new BadRequestException(`Supply can't drop below the ${existing.claimed} prizes already claimed`);
    }
    await this.hunts.save({ ...def, claimed: existing?.claimed ?? 0, active: existing?.active ?? true });
    return this.hunts.findOneByOrFail({ id: def.id });
  }

  async setActive(huntId: string, active: boolean) {
    const res = await this.hunts.update(huntId, { active });
    if (!res.affected) throw new NotFoundException("No such hunt");
  }

  /** Who finished and what was paid, for the partner's report. */
  async report(huntId: string) {
    const h = await this.hunts.findOneBy({ id: huntId });
    if (!h) throw new NotFoundException("No such hunt");
    const rows = await this.progress.find({ where: { huntId } });
    const finishers = rows.filter((r) => r.completedAt).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
    return {
      hunt: h,
      joined: rows.length,
      stepReached: h.steps.map((_, i) => rows.filter((r) => r.step > i).length),
      finishers: finishers.map((r) => ({ characterId: r.characterId, rank: r.rank, completedAt: Number(r.completedAt), payout: r.payout })),
    };
  }
}
