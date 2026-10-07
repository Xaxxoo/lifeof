import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { applyNeedDelta } from "@nyl/game-core";
import { SUBWAY_MOMENTS } from "@nyl/content";
import { addMoney, currentNeeds, getCity, requireCharacter } from "./lib";

/** Tip the performers on your train. Once per ride. */
export const tip = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    const a = c.activity;
    if (c.roomId !== "transit" || !a || a.kind !== "ride") throw new Error("You're not on a train");
    const moment = SUBWAY_MOMENTS.find((m) => m.id === a.rideMoment);
    if (!moment?.tip) throw new Error("Nobody to tip here");
    if (a.tipped) return;
    await addMoney(ctx, c._id, -1, "transit:tip", `tip:${a.id}`, { label: "Tipped the performers" });
    const now = Date.now();
    const needs = applyNeedDelta(currentNeeds(c, now, await getCity(ctx)), { fun: 6, social: 3 });
    await ctx.db.patch(c._id, { needs, needsUpdatedAt: now, activity: { ...a, tipped: true } });
  },
});
