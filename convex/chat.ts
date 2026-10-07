import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCharacter } from "./lib";

const MAX_LEN = 140;
/** Placeholder filter for M0. M3 replaces this with the full moderation pipeline (PRD §11.2). */
const BLOCKED = [/\bn[i1]gg/i, /\bf[a@]gg?[o0]t/i, /\bk[i1]ke\b/i, /\bch[i1]nk\b/i];

export const say = mutation({
  args: { token: v.string(), roomId: v.string(), body: v.string() },
  handler: async (ctx, { token, roomId, body }) => {
    const c = await requireCharacter(ctx, token);
    const text = body.trim().slice(0, MAX_LEN);
    if (!text) return;
    if (BLOCKED.some((r) => r.test(text))) throw new Error("That message can't be sent");
    await ctx.db.insert("messages", { roomId, characterId: c._id, name: c.name, body: text });
  },
});

export const recent = query({
  args: { roomId: v.string() },
  handler: async (ctx, { roomId }) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(30);
    return rows.reverse();
  },
});
