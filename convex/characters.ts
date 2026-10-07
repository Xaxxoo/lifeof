import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { decayNeeds, startingNeeds } from "@nyl/game-core";
import { ORIGIN_CASH_BONUS, ORIGIN_IDS, SHIRT_COLORS, SKIN_TONES, STATUSES, TRAIT_IDS } from "@nyl/content";
import { characterByToken } from "./lib";

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await characterByToken(ctx, token);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    origin: v.string(),
    status: v.string(),
    trait: v.string(),
    look: v.object({ skin: v.string(), shirt: v.string() }),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 20) throw new Error("Name must be 2–20 characters");
    if (args.token.length < 16) throw new Error("Bad session token");
    if (!(ORIGIN_IDS as readonly string[]).includes(args.origin)) throw new Error("Unknown origin");
    if (!(TRAIT_IDS as readonly string[]).includes(args.trait)) throw new Error("Unknown trait");
    if (!(SKIN_TONES as readonly string[]).includes(args.look.skin)) throw new Error("Unknown skin tone");
    if (!(SHIRT_COLORS as readonly string[]).includes(args.look.shirt)) throw new Error("Unknown shirt color");
    const status = STATUSES.find((s) => s.id === args.status);
    if (!status) throw new Error("Unknown status");

    const existing = await characterByToken(ctx, args.token);
    if (existing) return existing._id;

    const now = Date.now();
    const cash = status.startingCash + (ORIGIN_CASH_BONUS[args.origin] ?? 0);
    const id = await ctx.db.insert("characters", {
      token: args.token,
      name,
      origin: args.origin,
      status: args.status,
      trait: args.trait,
      look: args.look,
      cash,
      needs: startingNeeds(),
      needsUpdatedAt: now,
      lastSeenAt: now,
    });
    await ctx.db.insert("ledger", {
      characterId: id,
      delta: cash,
      balanceAfter: cash,
      reason: "arrival:savings",
      requestId: `arrival:${id}`,
    });
    return id;
  },
});

/** Settle needs decay into storage. Called on join so offline time uses the autopilot floor. */
export function settledNeeds(c: { needs: Parameters<typeof decayNeeds>[0]; needsUpdatedAt: number; lastSeenAt: number }, now: number) {
  const offlineGap = now - c.lastSeenAt > 2 * 60_000;
  return decayNeeds(c.needs, c.needsUpdatedAt, now, { offline: offlineGap });
}
