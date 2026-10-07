import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { decayNeeds, weatherNeedMultipliers, type Needs, type RoomGrid } from "@nyl/game-core";
import { buildRoomLayout, roomDef, type Interactable, type RoomDef } from "@nyl/content";

export async function characterByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return await ctx.db
    .query("characters")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export async function requireCharacter(ctx: QueryCtx | MutationCtx, token: string) {
  const c = await characterByToken(ctx, token);
  if (!c) throw new Error("No character for this session");
  return c;
}

export async function presenceOf(ctx: QueryCtx | MutationCtx, characterId: Id<"characters">) {
  return await ctx.db
    .query("presence")
    .withIndex("by_character", (q) => q.eq("characterId", characterId))
    .unique();
}

/** More than this since the last heartbeat counts as offline: autopilot rules apply to the gap. */
const OFFLINE_GAP_MS = 2 * 60_000;

export async function getCity(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("cityState")
    .withIndex("by_key", (q) => q.eq("key", "nyc"))
    .unique();
}

/**
 * Needs at `now`. Offline time uses the autopilot floor; online time feels the real weather.
 * Pass the city state when you have it, to apply weather.
 */
export function currentNeeds(c: Doc<"characters">, now: number, city?: Doc<"cityState"> | null): Needs {
  const offline = now - c.lastSeenAt > OFFLINE_GAP_MS;
  return decayNeeds(c.needs, c.needsUpdatedAt, now, {
    offline,
    multipliers: offline ? undefined : weatherNeedMultipliers(city?.weather),
  });
}

/**
 * The only way money moves. Writes a ledger row and the new balance in one transaction.
 * The same requestId never applies twice, so retries are safe.
 */
export async function addMoney(
  ctx: MutationCtx,
  characterId: Id<"characters">,
  delta: number,
  reason: string,
  requestId: string,
  opts: { label?: string; allowNegative?: boolean } = {},
): Promise<number> {
  const dup = await ctx.db
    .query("ledger")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
  const c = (await ctx.db.get(characterId))!;
  if (dup) return c.cash;
  const amount = Math.round(delta);
  const balanceAfter = c.cash + amount;
  if (balanceAfter < 0 && !opts.allowNegative) throw new Error("Not enough money");
  await ctx.db.insert("ledger", { characterId, delta: amount, balanceAfter, reason, label: opts.label, requestId });
  await ctx.db.patch(characterId, { cash: balanceAfter });
  return balanceAfter;
}

export interface LoadedRoom {
  room: RoomDef;
  grid: RoomGrid;
  objects: Doc<"objects">[];
  interactables: Map<string, Interactable>;
}

/** Room layout + placed furniture as one walkable grid and a list of things you can tap. */
export async function loadRoom(ctx: QueryCtx | MutationCtx, roomId: string): Promise<LoadedRoom> {
  const room = roomDef(roomId);
  if (!room) throw new Error("Unknown room");
  const objects = await ctx.db
    .query("objects")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .take(200);
  const { grid, interactables } = buildRoomLayout(room, objects);
  return { room, grid, objects, interactables };
}

/**
 * The character's presence row, recreated at the room's spawn if the cleanup cron removed it
 * (phone slept, tab backgrounded). Returns null during a work shift.
 */
export async function ensurePresence(ctx: MutationCtx, c: Doc<"characters">, now: number) {
  if (c.roomId === "work" || c.roomId === "transit") return null;
  const existing = await presenceOf(ctx, c._id);
  if (existing) return existing;
  const room = roomDef(c.roomId);
  if (!room) return null;
  const id = await ctx.db.insert("presence", { characterId: c._id, roomId: c.roomId, path: [room.spawn], startedAt: now, updatedAt: now });
  return (await ctx.db.get(id))!;
}
