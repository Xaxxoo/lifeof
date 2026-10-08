import { footprintTiles, type RoomGrid, type Tile } from "@nyl/game-core";
import { ITEM_BY_ID } from "./items";
import { wallEdges } from "./homes";
import type { RoomDef } from "./rooms";

export interface PlacedItem {
  _id: string;
  itemId: string;
  x: number;
  y: number;
  rot: number;
}

export interface Interactable {
  key: string;
  label: string;
  tiles: Tile[];
  actions: string[];
  /** Where a sitting or sleeping avatar goes, and how high (null = stand beside it). */
  seat: { x: number; z: number; y: number } | null;
  center: { x: number; z: number };
  /** Walk onto it (lawn, dance floor) rather than up to it. */
  walkOn?: boolean;
  tags?: string[];
  kind: "prop" | "object" | "npc";
}

const SEAT_HEIGHT: Record<string, number> = {
  bed: 0.47,
  mattress: 0.27,
  sofa: 0.38,
  armchair: 0.38,
  chair: 0.45,
  toilet: 0.42,
  desk: 0,
  guitar: 0,
  tv: 0,
};

/** Props you sit on, and how high. */
const PROP_SEAT: Partial<Record<string, number>> = { bench: 0.32, stool: 0.5, salonchair: 0.5, pew: 0.45 };

/**
 * One source of truth for a room's walkable grid and tappable things,
 * used by the server to validate and by the client to predict.
 */
export function buildRoomLayout(room: RoomDef, objects: PlacedItem[]): { grid: RoomGrid; interactables: Map<string, Interactable> } {
  const blocked = new Set<string>();
  const interactables = new Map<string, Interactable>();
  const centerOf = (tiles: Tile[]) => ({
    x: tiles.reduce((s, t) => s + t.x, 0) / tiles.length + 0.5,
    z: tiles.reduce((s, t) => s + t.y, 0) / tiles.length + 0.5,
  });

  for (const p of room.props) {
    const tiles = footprintTiles(p.x, p.y, p.w, p.h);
    if (!p.walkable) for (const t of tiles) blocked.add(`${t.x},${t.y}`);
    if (p.actions?.length || p.tags?.length) {
      const center = centerOf(tiles);
      interactables.set(`prop:${p.id}`, {
        key: `prop:${p.id}`,
        label: p.label ?? p.kind,
        tiles,
        actions: p.actions ?? [],
        center,
        seat: PROP_SEAT[p.kind] !== undefined ? { ...center, y: PROP_SEAT[p.kind]! } : p.walkable ? { ...center, y: 0.02 } : null,
        walkOn: p.walkable,
        tags: p.tags,
        kind: "prop",
      });
    }
  }
  for (const n of room.npcs ?? []) {
    if (n.patrol) continue;
    const tiles = [{ x: n.x, y: n.y }];
    blocked.add(`${n.x},${n.y}`);
    interactables.set(`npc:${n.id}`, {
      key: `npc:${n.id}`,
      label: `${n.name} · ${n.role}`,
      tiles,
      actions: n.origin ? ["chat_npc", "talk_home"] : ["chat_npc"],
      center: centerOf(tiles),
      seat: null,
      kind: "npc",
    });
  }
  for (const o of objects) {
    const item = ITEM_BY_ID[o.itemId];
    if (!item) continue;
    const tiles = footprintTiles(o.x, o.y, item.w, item.h, o.rot);
    if (!item.walkable) for (const t of tiles) blocked.add(`${t.x},${t.y}`);
    if (item.actions.length) {
      const center = centerOf(tiles);
      const h = SEAT_HEIGHT[item.model];
      interactables.set(`obj:${o._id}`, {
        key: `obj:${o._id}`,
        label: item.name,
        tiles,
        actions: item.actions,
        center,
        seat: h ? { ...center, y: h } : null,
        kind: "object",
      });
    }
  }
  const edges = room.home ? wallEdges(room.home.layout.walls) : undefined;
  return { grid: { width: room.width, height: room.height, blocked, edges }, interactables };
}

/** Where to walk to use something: onto it for lawns and dance floors, beside it otherwise. */
export function goalTiles(thing: Pick<Interactable, "tiles" | "walkOn">): Tile[] {
  return thing.walkOn ? thing.tiles : sideTiles(thing.tiles);
}

/** Tiles next to a footprint (not inside it), as walking goals. */
export function sideTiles(tiles: Tile[]): Tile[] {
  const inside = new Set(tiles.map((t) => `${t.x},${t.y}`));
  const out: Tile[] = [];
  for (const t of tiles) {
    for (const n of [
      { x: t.x + 1, y: t.y },
      { x: t.x - 1, y: t.y },
      { x: t.x, y: t.y + 1 },
      { x: t.x, y: t.y - 1 },
    ]) {
      if (!inside.has(`${n.x},${n.y}`)) out.push(n);
    }
  }
  return out;
}
