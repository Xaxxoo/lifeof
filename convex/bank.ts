import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { rentPeriodKey, upsertMoodlet } from "@nyl/game-core";
import { addMoney, requireCharacter } from "./lib";

const LATE_FEE = 25;

export const ledger = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    return await ctx.db
      .query("ledger")
      .withIndex("by_character", (q) => q.eq("characterId", c._id))
      .order("desc")
      .take(30);
  },
});

/** Pay off rent you owe (from missed Sundays). */
export const payRent = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    if (c.rent.owed <= 0) throw new Error("You don't owe any rent");
    await addMoney(ctx, c._id, -c.rent.owed, "rent:arrears", `arrears:${c._id}:${c.rent.lastPeriod}:${c.rent.owed}`, {
      label: "Paid rent you owed",
    });
    await ctx.db.patch(c._id, { rent: { ...c.rent, owed: 0, missedWeeks: 0 } });
  },
});

/**
 * Runs hourly. When a character's rent period has rolled over (Sunday 8 PM New York), charge a week.
 * Can't pay: the week (plus a late fee) is added to what they owe. Tier 1 has nowhere lower to go, so no eviction yet.
 */
export const collectRent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const period = rentPeriodKey(now);
    // Beta scale: a few thousand characters. Paginate with a cursor before launch.
    const all = await ctx.db.query("characters").take(5000);
    for (const c of all) {
      if (c.rent.lastPeriod === period) continue;
      const due = c.rent.perWeek;
      if (c.cash >= due) {
        await addMoney(ctx, c._id, -due, "rent:weekly", `rent:${c._id}:${period}`, { label: "Weekly rent, basement room" });
        await ctx.db.patch(c._id, { rent: { ...c.rent, lastPeriod: period } });
      } else {
        await ctx.db.patch(c._id, {
          rent: { ...c.rent, lastPeriod: period, owed: c.rent.owed + due + LATE_FEE, missedWeeks: c.rent.missedWeeks + 1 },
          moodlets: upsertMoodlet(
            c.moodlets,
            { id: "landlord", label: "The landlord texted. Again.", value: -10, expiresAt: now + 24 * 3_600_000 },
            now,
          ),
        });
      }
    }
  },
});
