import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { isOpenAt, nycDateKey, nycTime, rentPeriodKey } from "@nyl/game-core";
import { AUTOPILOT_PAY_RATE, CAREERS, STUDENT_SHIFTS_PER_WEEK } from "@nyl/content";
import { addMoney, requireCharacter } from "./lib";

export const apply = mutation({
  args: { token: v.string(), careerId: v.string() },
  handler: async (ctx, { token, careerId }) => {
    const c = await requireCharacter(ctx, token);
    const career = CAREERS[careerId];
    if (!career) throw new Error("Unknown career");
    if (c.job) throw new Error("Quit your current job first");
    if (c.status === "student" && !career.studentFriendly) throw new Error("Student visa: campus jobs only");
    await ctx.db.patch(c._id, { job: { careerId, level: 1, shiftsAtLevel: 0, totalShifts: 0 } });
    return career.levels[0]!.title;
  },
});

export const quit = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    if (c.roomId === "work") throw new Error("Finish your shift first");
    await ctx.db.patch(c._id, { job: undefined });
  },
});

/** Offline players with a job still go to one shift a day, at reduced pay (PRD §5 autopilot). */
const OFFLINE_FOR_MS = 30 * 60_000;

export const autopilotTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const t = nycTime(now);
    const today = nycDateKey(now);
    const period = rentPeriodKey(now);
    const away = await ctx.db
      .query("characters")
      .withIndex("by_last_seen", (q) => q.lt("lastSeenAt", now - OFFLINE_FOR_MS))
      .take(200);
    for (const c of away) {
      if (!c.job || c.activity || c.roomId === "work" || c.autopilotDay === today) continue;
      const career = CAREERS[c.job.careerId];
      if (!career || !isOpenAt(career.hours, t)) continue;
      const worked = c.shiftWeek.period === period ? c.shiftWeek.count : 0;
      if (c.status === "student" && worked >= STUDENT_SHIFTS_PER_WEEK) continue;
      const level = career.levels[c.job.level - 1]!;
      const pay = Math.round(level.payPerShift * AUTOPILOT_PAY_RATE);
      await addMoney(ctx, c._id, pay, "work:autopilot", `autopilot:${c._id}:${today}`, {
        label: `Autopilot shift as ${level.title}`,
      });
      await ctx.db.patch(c._id, {
        autopilotDay: today,
        shiftWeek: { period, count: worked + 1 },
        job: { ...c.job, totalShifts: c.job.totalShifts + 1 },
      });
    }
  },
});
