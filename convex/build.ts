import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { footprintTiles, inBounds, tileAt } from "@nyl/game-core";
import { ITEM_BY_ID, SELL_BACK_RATE, homeRoomId, roomDef } from "@nyl/content";
import { addMoney, presenceOf, requireCharacter } from "./lib";

/** Build mode only works in your own home, while you're there and not busy. */
async function requireAtHome(ctx: MutationCtx, token: string) {
  const c = await requireCharacter(ctx, token);
  const roomId = homeRoomId(c._id);
  if (c.roomId !== roomId) throw new Error("Build mode works at home");
  if (c.activity) throw new Error("Finish what you're doing first");
  return { c, roomId };
}

/** Checks a placement against walls, the door, the player, and other furniture (ignoring `ignoreId`). */
async function validatePlacement(
  ctx: MutationCtx,
  c: Doc<"characters">,
  roomId: string,
  itemId: string,
  x: number,
  y: number,
  rot: number,
  ignoreId?: Id<"objects">,
) {
  const item = ITEM_BY_ID[itemId];
  const room = roomDef(roomId);
  if (!item || !room) throw new Error("Unknown item");
  if (![0, 1, 2, 3].includes(rot)) throw new Error("Bad rotation");
  const tiles = footprintTiles(x, y, item.w, item.h, rot);
  const grid = { width: room.width, height: room.height, blocked: new Set<string>() };
  if (tiles.some((t) => !inBounds(grid, t))) throw new Error("It doesn't fit there");

  const taken = new Set<string>();
  for (const p of room.props) for (const t of footprintTiles(p.x, p.y, p.w, p.h)) taken.add(`${t.x},${t.y}`);
  // Keep the tile inside the door free so you can always get in and out.
  const door = room.props.find((p) => p.kind === "door");
  const doorway = door ? `${door.x + 1},${door.y}` : null;

  const objects = await ctx.db
    .query("objects")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .take(200);
  const flatTaken = new Set<string>();
  for (const o of objects) {
    if (o._id === ignoreId) continue;
    const other = ITEM_BY_ID[o.itemId];
    if (!other) continue;
    for (const t of footprintTiles(o.x, o.y, other.w, other.h, o.rot)) (other.walkable ? flatTaken : taken).add(`${t.x},${t.y}`);
  }

  const p = await presenceOf(ctx, c._id);
  const standing = p ? tileAt({ path: p.path, startedAt: p.startedAt }, Date.now()) : null;

  for (const t of tiles) {
    const k = `${t.x},${t.y}`;
    if (item.walkable) {
      if (flatTaken.has(k)) throw new Error("Rugs can't overlap other rugs");
      if (taken.has(k) && room.props.some((pr) => footprintTiles(pr.x, pr.y, pr.w, pr.h).some((s) => s.x === t.x && s.y === t.y))) {
        throw new Error("Something is already there");
      }
      continue;
    }
    if (taken.has(k)) throw new Error("Something is already there");
    if (k === doorway) throw new Error("Keep the front door clear");
    if (standing && standing.x === t.x && standing.y === t.y) throw new Error("You're standing there");
  }
  return item;
}

export const place = mutation({
  args: { token: v.string(), itemId: v.string(), x: v.number(), y: v.number(), rot: v.number(), requestId: v.string() },
  handler: async (ctx, { token, itemId, x, y, rot, requestId }) => {
    const { c, roomId } = await requireAtHome(ctx, token);
    const item = await validatePlacement(ctx, c, roomId, itemId, x, y, rot);
    if (item.price > 0) await addMoney(ctx, c._id, -item.price, "buy:furniture", `build:${requestId}`, { label: item.name });
    return await ctx.db.insert("objects", { roomId, itemId, x, y, rot, paid: item.price });
  },
});

export const move = mutation({
  args: { token: v.string(), objectId: v.id("objects"), x: v.number(), y: v.number(), rot: v.number() },
  handler: async (ctx, { token, objectId, x, y, rot }) => {
    const { c, roomId } = await requireAtHome(ctx, token);
    const o = await ctx.db.get(objectId);
    if (!o || o.roomId !== roomId) throw new Error("That isn't yours");
    await validatePlacement(ctx, c, roomId, o.itemId, x, y, rot, o._id);
    await ctx.db.patch(objectId, { x, y, rot });
  },
});

export const sell = mutation({
  args: { token: v.string(), objectId: v.id("objects") },
  handler: async (ctx, { token, objectId }) => {
    const { c, roomId } = await requireAtHome(ctx, token);
    const o = await ctx.db.get(objectId);
    if (!o || o.roomId !== roomId) throw new Error("That isn't yours");
    const item = ITEM_BY_ID[o.itemId];
    const refund = Math.floor(o.paid * SELL_BACK_RATE);
    await ctx.db.delete(objectId);
    if (refund > 0) await addMoney(ctx, c._id, refund, "sell:furniture", `sell:${objectId}`, { label: `Sold ${item?.name ?? "item"}` });
    return { refund };
  },
});
