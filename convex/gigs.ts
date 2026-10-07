import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { skillLevel, upsertMoodlet, weatherKind, type Moodlet, type Skills } from "@nyl/game-core";
import { GIGS, GIG_BY_ID, GIG_WINDOW_MS, buildRoomLayout, roomDef, type GigDef } from "@nyl/content";
import { addMoney, requireCharacter } from "./lib";

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

/** Small deterministic PRNG so the server can re-create the exact offer a player accepted. */
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

/** Offers for this player on this block in this 10-minute window. */
export function offersFor(c: Doc<"characters">, roomId: string, window: number): GigOffer[] {
  const room = roomDef(roomId);
  if (!room || (room.kind !== "street" && room.kind !== "park")) return [];
  const { interactables } = buildRoomLayout(room, []);
  const things = [...interactables.values()].filter((t) => t.kind === "prop");
  const out: GigOffer[] = [];
  for (const g of GIGS) {
    const rand = rng(`${c._id}:${roomId}:${window}:${g.id}`);
    const steps: GigOffer["steps"] = [];
    let last = "";
    for (const stop of g.stops) {
      const options = things.filter((t) => t.key !== last && t.tags?.some((tag) => (stop.tags as string[]).includes(tag)));
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

function lockReason(c: Doc<"characters">, g: GigDef): string | null {
  if (c.status === "student") return "Student visa: gigs aren't allowed";
  for (const r of g.requires ?? []) if (skillLevel(c.skills[r.skill]) < r.level) return `Needs ${r.skill} level ${r.level}`;
  return null;
}

export const offers = query({
  args: { token: v.string(), window: v.number() },
  handler: async (ctx: QueryCtx, { token, window }) => {
    const c = await requireCharacter(ctx, token);
    return offersFor(c, c.roomId, window);
  },
});

export const accept = mutation({
  args: { token: v.string(), offerId: v.string() },
  handler: async (ctx, { token, offerId }) => {
    const c = await requireCharacter(ctx, token);
    if (c.gig) throw new Error("Finish your current gig first");
    const now = Date.now();
    const [, roomId, w] = offerId.split(":");
    const window = Number(w);
    // Offers stay valid for the window they were shown in and the next one.
    if (roomId !== c.roomId || !Number.isFinite(window) || Math.floor(now / GIG_WINDOW_MS) - window > 1) {
      throw new Error("That gig is gone. Refresh the app");
    }
    const offer = offersFor(c, c.roomId, window).find((o) => o.offerId === offerId);
    if (!offer) throw new Error("That gig is gone. Refresh the app");
    if (offer.locked) throw new Error(offer.locked);
    const def = GIG_BY_ID[offer.gigId]!;
    await ctx.db.patch(c._id, {
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
  },
});

export const cancel = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    if (!c.gig) return;
    const stats = c.gigStats ?? { done: 0, rating: 5 };
    await ctx.db.patch(c._id, {
      gig: undefined,
      gigStats: { done: stats.done, rating: Math.max(1, Math.round((stats.rating - 0.2) * 10) / 10) },
    });
  },
});

/** Called when a gig stop's action finishes. Pays out after the last stop. */
export async function advanceGig(
  ctx: MutationCtx,
  c: Doc<"characters">,
  now: number,
  city: Doc<"cityState"> | null,
  skills: Skills,
  moodlets: Moodlet[],
): Promise<{ gig: Doc<"characters">["gig"]; gigStats?: { done: number; rating: number }; skills: Skills; moodlets: Moodlet[] }> {
  const g = c.gig!;
  const next = g.step + 1;
  if (next < g.steps.length) return { gig: { ...g, step: next }, skills, moodlets };

  const def = GIG_BY_ID[g.gigId];
  const onTime = now <= g.deadline;
  const raining = weatherKind(city?.weather.summary ?? "") === "rain";
  const tip = Math.round(g.tip * (onTime ? 1 : 0.3) * (raining ? 2 : 1));
  await addMoney(ctx, c._id, g.pay + tip, "gig:payout", `gig:${g.id}`, {
    label: `${def?.app ?? "Gig"}: ${def?.name ?? "gig"}${tip ? ` + $${tip} tip${raining ? " (rain bonus)" : ""}` : ""}`,
  });
  if (def) skills = { ...skills, [def.skillXp.key]: skills[def.skillXp.key] + def.skillXp.xp };
  const stars = onTime ? 5 : 3;
  const stats = c.gigStats ?? { done: 0, rating: 5 };
  const rating = Math.round(((stats.rating * stats.done + stars) / (stats.done + 1)) * 10) / 10;
  if (onTime) {
    moodlets = upsertMoodlet(moodlets, { id: "five-stars", label: "Five stars ⭐⭐⭐⭐⭐", value: 4, expiresAt: now + 2 * 3_600_000 }, now);
  }
  return { gig: undefined, gigStats: { done: stats.done + 1, rating }, skills, moodlets };
}
