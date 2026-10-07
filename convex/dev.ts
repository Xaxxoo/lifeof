import { internalMutation } from "./_generated/server";

/**
 * Wipes game tables on a dev deployment. Internal only: run with `npx convex run dev:reset`.
 * Refuses to run when IS_PRODUCTION is set.
 */
export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.IS_PRODUCTION) throw new Error("Refusing to reset production");
    const tables = ["characters", "presence", "ledger", "messages", "objects"] as const;
    let deleted = 0;
    for (const t of tables) {
      // objects may not exist on older schemas.
      try {
        const rows = await ctx.db.query(t as "characters").take(1000);
        for (const r of rows) {
          await ctx.db.delete(r._id);
          deleted++;
        }
      } catch {
        // table missing
      }
    }
    return { deleted };
  },
});

/** Makes every character's rent due now, to test Sunday rent without waiting. `npx convex run dev:makeRentDue` */
export const makeRentDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.IS_PRODUCTION) throw new Error("Refusing to run in production");
    const all = await ctx.db.query("characters").take(1000);
    for (const c of all) await ctx.db.patch(c._id, { rent: { ...c.rent, lastPeriod: "2000-01-02" } });
    return all.length;
  },
});
