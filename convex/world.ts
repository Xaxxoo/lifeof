import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { findPath, tileAt } from "@nyl/game-core";
import { STREET_ID, roomDef } from "@nyl/content";
import { currentNeeds, ensurePresence, loadRoom, presenceOf, requireCharacter } from "./lib";
import { cancelActivity } from "./play";
import { tile } from "./schema";

const STALE_MS = 45_000;

/** Puts the character back where they were (or on the street) and returns the server clock for syncing. */
export const join = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    const now = Date.now();
    await ctx.db.patch(c._id, { needs: currentNeeds(c, now), needsUpdatedAt: now, lastSeenAt: now });
    if (c.roomId === "work") return { serverNow: now, roomId: "work" };

    const roomId = roomDef(c.roomId) ? c.roomId : STREET_ID;
    const existing = await presenceOf(ctx, c._id);
    if (existing && existing.roomId === roomId) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return { serverNow: now, roomId };
    }
    if (existing) await ctx.db.delete(existing._id);
    const room = roomDef(roomId)!;
    await ctx.db.insert("presence", { characterId: c._id, roomId, path: [room.spawn], startedAt: now, updatedAt: now });
    if (roomId !== c.roomId) await ctx.db.patch(c._id, { roomId });
    return { serverNow: now, roomId };
  },
});

/** Client sends a target tile; the server pathfinds from where the avatar is right now. Walking cancels an action. */
export const move = mutation({
  args: { token: v.string(), target: tile },
  handler: async (ctx, { token, target }) => {
    const c = await requireCharacter(ctx, token);
    if (c.roomId === "work") throw new Error("You're at work");
    const now = Date.now();
    if (c.activity) await cancelActivity(ctx, c, now);
    const p = await ensurePresence(ctx, (await ctx.db.get(c._id))!, now);
    if (!p) throw new Error("Not in a room");
    const { grid } = await loadRoom(ctx, p.roomId);
    const from = tileAt({ path: p.path, startedAt: p.startedAt }, now);
    const path = findPath(grid, from, { x: Math.round(target.x), y: Math.round(target.y) });
    if (!path) return { ok: false as const };
    await ctx.db.patch(p._id, { path, startedAt: now, updatedAt: now });
    await ctx.db.patch(c._id, { lastSeenAt: now });
    return { ok: true as const };
  },
});

export const heartbeat = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    const now = Date.now();
    const p = await ensurePresence(ctx, c, now);
    if (p) await ctx.db.patch(p._id, { updatedAt: now });
    await ctx.db.patch(c._id, { lastSeenAt: now });
  },
});

export const leave = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    const p = await presenceOf(ctx, c._id);
    if (p) await ctx.db.delete(p._id);
  },
});

/** Everyone in a room, with what the renderer needs. Stale rows are removed by a cron. */
export const occupants = query({
  args: { roomId: v.string() },
  handler: async (ctx, { roomId }) => {
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .take(60);
    const out = [];
    for (const p of rows) {
      const c = await ctx.db.get(p.characterId);
      if (!c) continue;
      const a = c.activity && c.activity.roomId === roomId ? c.activity : null;
      out.push({
        characterId: c._id,
        name: c.name,
        origin: c.origin,
        look: c.look,
        path: p.path,
        startedAt: p.startedAt,
        activity: a ? { status: a.status, pose: a.pose ?? "stand", startsAt: a.startsAt, endsAt: a.endsAt, target: a.target } : null,
      });
    }
    return out;
  },
});

/** Placed furniture in a room (homes). */
export const objects = query({
  args: { roomId: v.string() },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .take(200);
  },
});

/** Which room this session is in right now, so the client can switch scenes. */
export const whereAmI = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    return c.roomId;
  },
});

export const cleanupPresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_updated", (q) => q.lt("updatedAt", Date.now() - STALE_MS))
      .take(200);
    for (const p of stale) await ctx.db.delete(p._id);
  },
});
