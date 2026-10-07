import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { skillLevel, upsertMoodlet, weatherKind, type Moodlet, type Skills } from "@nyl/game-core";
import { GIGS, GIG_BY_ID, GIG_WINDOW_MS, buildRoomLayout, roomDef, type GigDef } from "@nyl/content";
import { Character } from "../entities/character.entity";
import { CityState } from "../entities/city-state.entity";
import { BankService } from "../bank/bank.service";

export interface GigOffer {
  offerId: string;
  gigId: string;
  app: string;
  name: string;
  emoji: string;
  pay: number;
  minutes: number;
  steps: { target: string; label: string; action: string; place: string }[];
  locked: string | null;
}

function rng(seed: string) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (Math.imul(31, a) + seed.charCodeAt(i)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lockReason(c: Character, g: GigDef): string | null {
  if (c.status === "student") return "Student visa: gigs aren't allowed";
  for (const r of g.requires ?? []) if (skillLevel(c.skills[r.skill]) < r.level) return `Needs ${r.skill} level ${r.level}`;
  return null;
}

function offersFor(c: Character, roomId: string, window: number): GigOffer[] {
  const room = roomDef(roomId);
  if (!room || (room.kind !== "street" && room.kind !== "park")) return [];
  const { interactables } = buildRoomLayout(room, []);
  const things = [...interactables.values()].filter((t) => t.kind === "prop");
  const out: GigOffer[] = [];
  for (const g of GIGS) {
    const rand = rng(`${c.id}:${roomId}:${window}:${g.id}`);
    const steps: GigOffer["steps"] = [];
    let last = "";
    for (const stop of g.stops) {
      const options = things.filter(
        (t) => t.key !== last && t.tags?.some((tag) => (stop.tags as string[]).includes(tag)),
      );
      if (!options.length) break;
      const pick = options[Math.floor(rand() * options.length)]!;
      steps.push({ target: pick.key, label: stop.label, action: stop.action, place: pick.label });
      last = pick.key;
    }
    if (steps.length !== g.stops.length) continue;
    const pay = Math.round(g.pay[0] + rand() * (g.pay[1] - g.pay[0]));
    out.push({
      offerId: `${g.id}:${roomId}:${window}`,
      gigId: g.id,
      app: g.app,
      name: g.name,
      emoji: g.emoji,
      pay,
      minutes: g.minutes,
      steps,
      locked: lockReason(c, g),
    });
  }
  return out;
}

@Injectable()
export class GigsService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    private bank: BankService,
  ) {}

  async offers(token: string, window: number) {
    const c = await this.requireByToken(token);
    return offersFor(c, c.roomId, window);
  }

  async accept(token: string, offerId: string) {
    const c = await this.requireByToken(token);
    if (c.gig) throw new BadRequestException("Finish your current gig first");
    const now = Date.now();
    const parts = offerId.split(":");
    const roomId = parts[1]!;
    const window = Number(parts[2]);
    if (roomId !== c.roomId || !Number.isFinite(window) || Math.floor(now / GIG_WINDOW_MS) - window > 1) {
      throw new BadRequestException("That gig is gone. Refresh the app");
    }
    const offer = offersFor(c, c.roomId, window).find((o) => o.offerId === offerId);
    if (!offer) throw new BadRequestException("That gig is gone. Refresh the app");
    if (offer.locked) throw new BadRequestException(offer.locked);
    const def = GIG_BY_ID[offer.gigId]!;
    await this.characters.update(c.id, {
      gig: {
        id: `${offerId}:${now}`,
        gigId: offer.gigId,
        roomId: c.roomId,
        steps: offer.steps.map(({ target, label, action }) => ({ target, label, action })),
        step: 0,
        pay: offer.pay,
        tip: def.tip,
        startedAt: now,
        deadline: now + def.minutes * 60_000,
      },
    });
    return offer;
  }

  async cancel(token: string) {
    const c = await this.requireByToken(token);
    if (!c.gig) return;
    const stats = c.gigStats ?? { done: 0, rating: 5 };
    await this.characters.update(c.id, {
      gig: null,
      gigStats: { done: stats.done, rating: Math.max(1, Math.round((stats.rating - 0.2) * 10) / 10) },
    });
  }

  /** Called when a gig stop's action finishes. Pays out after the last stop. */
  async advanceGig(
    c: Character,
    now: number,
    city: CityState | null,
    skills: Skills,
    moodlets: Moodlet[],
  ): Promise<{
    gig: Character["gig"];
    gigStats?: { done: number; rating: number };
    skills: Skills;
    moodlets: Moodlet[];
  }> {
    const g = c.gig!;
    const next = g.step + 1;
    if (next < g.steps.length) return { gig: { ...g, step: next }, skills, moodlets };

    const def = GIG_BY_ID[g.gigId];
    const onTime = now <= g.deadline;
    const raining = weatherKind(city?.weather.summary ?? "") === "rain";
    const tip = Math.round(g.tip * (onTime ? 1 : 0.3) * (raining ? 2 : 1));
    await this.bank.addMoney(c.id, g.pay + tip, "gig:payout", `gig:${g.id}`, {
      label: `${def?.app ?? "Gig"}: ${def?.name ?? "gig"}${tip ? ` + $${tip} tip${raining ? " (rain bonus)" : ""}` : ""}`,
    });
    if (def) skills = { ...skills, [def.skillXp.key]: skills[def.skillXp.key] + def.skillXp.xp };
    const stars = onTime ? 5 : 3;
    const stats = c.gigStats ?? { done: 0, rating: 5 };
    const rating = Math.round(((stats.rating * stats.done + stars) / (stats.done + 1)) * 10) / 10;
    if (onTime) {
      moodlets = upsertMoodlet(
        moodlets,
        { id: "five-stars", label: "Five stars ⭐⭐⭐⭐⭐", value: 4, expiresAt: now + 2 * 3_600_000 },
        now,
      );
    }
    return { gig: null, gigStats: { done: stats.done + 1, rating }, skills, moodlets };
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
