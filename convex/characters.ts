import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { emptySkills, rentPeriodKey, startingNeeds } from "@nyl/game-core";
import {
  BASEMENT_STARTER,
  HAIR_COLORS,
  HAIR_STYLE_IDS,
  HOME_RENT_PER_WEEK,
  ORIGIN_CASH_BONUS,
  ORIGIN_IDS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  STATUSES,
  STREET_ID,
  TRAIT_IDS,
  homeRoomId,
} from "@nyl/content";
import { characterByToken } from "./lib";
import { look } from "./schema";

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await characterByToken(ctx, token);
  },
});

const oneOf = (list: readonly string[], value: string, what: string) => {
  if (!list.includes(value)) throw new Error(`Unknown ${what}`);
};

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    origin: v.string(),
    status: v.string(),
    trait: v.string(),
    look,
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 20) throw new Error("Name must be 2–20 characters");
    if (args.token.length < 16) throw new Error("Bad session token");
    oneOf(ORIGIN_IDS, args.origin, "origin");
    oneOf(TRAIT_IDS, args.trait, "trait");
    oneOf(SKIN_TONES, args.look.skin, "skin tone");
    oneOf(SHIRT_COLORS, args.look.shirt, "shirt color");
    oneOf(PANTS_COLORS, args.look.pants, "pants color");
    oneOf(HAIR_STYLE_IDS, args.look.hair, "hairstyle");
    oneOf(HAIR_COLORS, args.look.hairColor, "hair color");
    const status = STATUSES.find((s) => s.id === args.status);
    if (!status) throw new Error("Unknown status");

    const existing = await characterByToken(ctx, args.token);
    if (existing) return existing._id;

    const now = Date.now();
    const id = await ctx.db.insert("characters", {
      token: args.token,
      name,
      origin: args.origin,
      status: args.status,
      trait: args.trait,
      look: args.look,
      cash: 0,
      needs: startingNeeds(),
      needsUpdatedAt: now,
      lastSeenAt: now,
      skills: emptySkills(),
      moodlets: [],
      roomId: STREET_ID,
      shiftWeek: { period: rentPeriodKey(now), count: 0 },
      // First rent is due at the next Sunday 8 PM, not immediately.
      rent: { perWeek: HOME_RENT_PER_WEEK, lastPeriod: rentPeriodKey(now), owed: 0, missedWeeks: 0 },
    });

    const cash = status.startingCash + (ORIGIN_CASH_BONUS[args.origin] ?? 0);
    const balanceAfter = cash;
    await ctx.db.insert("ledger", {
      characterId: id,
      delta: cash,
      balanceAfter,
      reason: "arrival:savings",
      label: "Savings you arrived with",
      requestId: `arrival:${id}`,
    });
    await ctx.db.patch(id, { cash: balanceAfter });

    // Tier 1 housing: a furnished basement room is waiting.
    for (const s of BASEMENT_STARTER) {
      await ctx.db.insert("objects", { roomId: homeRoomId(id), itemId: s.itemId, x: s.x, y: s.y, rot: s.rot, paid: 0 });
    }
    return id;
  },
});
