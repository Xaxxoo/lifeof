import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { findPath, tileAt, type RoomGrid } from "@nyl/game-core";
import { ROOMS, blockedTiles } from "@nyl/content";
import { requireCharacter } from "./lib";
import { settledNeeds } from "./characters";
import { tile } from "./schema";

const STALE_MS = 45_000;

function gridFor(roomId: string): { grid: RoomGrid; spawn: { x: number; y: number } } {
  const room = ROOMS[roomId];
  if (!room) throw new Error("Unknown room");
  return { grid: { width: room.width, height: room.height, blocked: blockedTiles(room) }, spawn: room.spawn };
}

export const join = mutation({
  args: { token: v.string(), roomId: v.string() },
  handler: async (ctx, { token, roomId }) => {
    const c = await requireCharacter(ctx, token);
    const { spawn } = gridFor(roomId);
    const now = Date.now();
    await ctx.db.patch(c._id, { needs: settledNeeds(c, now), needsUpdatedAt: now, lastSeenAt: now });

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_character", (q) => q.eq("characterId", c._id))
      .unique();
    if (existing && existing.roomId === roomId) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return { serverNow: now };
    }
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("presence", { characterId: c._id, roomId, path: [spawn], startedAt: now, updatedAt: now });
    return { serverNow: now };
  },
});

/** Client sends a target tile; the server pathfinds from where the avatar is right now. */
export const move = mutation({
  args: { token: v.string(), target: tile },
  handler: async (ctx, { token, target }) => {
    const c = await requireCharacter(ctx, token);
    const p = await ctx.db
      .query("presence")
      .withIndex("by_character", (q) => q.eq("characterId", c._id))
      .unique();
    if (!p) throw new Error("Not in a room");
    const now = Date.now();
    const { grid } = gridFor(p.roomId);
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
    const p = await ctx.db
      .query("presence")
      .withIndex("by_character", (q) => q.eq("characterId", c._id))
      .unique();
    if (p) await ctx.db.patch(p._id, { updatedAt: now });
    await ctx.db.patch(c._id, { lastSeenAt: now });
  },
});

export const leave = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    const p = await ctx.db
      .query("presence")
      .withIndex("by_character", (q) => q.eq("characterId", c._id))
      .unique();
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
      out.push({
        characterId: c._id,
        name: c.name,
        origin: c.origin,
        look: c.look,
        path: p.path,
        startedAt: p.startedAt,
      });
    }
    return out;
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
