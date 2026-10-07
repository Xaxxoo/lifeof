/**
 * Room layouts. A room is a tile grid; props block tiles and tell the renderer what to draw.
 * M0 ships one public street block. Coordinates: x runs east, y runs south.
 */
export type PropKind = "building" | "stoop" | "tree" | "bench" | "cart" | "hydrant" | "subway" | "lamp";

export interface Prop {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
}

export interface RoomDef {
  id: string;
  name: string;
  neighborhood: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  capacity: number;
  props: Prop[];
}

export const BUSHWICK_BLOCK: RoomDef = {
  id: "bushwick-block",
  name: "Knickerbocker Ave",
  neighborhood: "Bushwick",
  width: 16,
  height: 16,
  spawn: { x: 8, y: 12 },
  capacity: 30,
  props: [
    { id: "bodega", kind: "building", x: 0, y: 0, w: 4, h: 3, label: "Bodega 24/7", color: "#c0392b" },
    { id: "walkup", kind: "building", x: 4, y: 0, w: 5, h: 3, label: "Walk-up", color: "#8e4a35" },
    { id: "barber", kind: "building", x: 9, y: 0, w: 3, h: 3, label: "Barbershop", color: "#2c3e50" },
    { id: "laundromat", kind: "building", x: 12, y: 0, w: 4, h: 3, label: "Laundromat", color: "#3d6b8f" },
    { id: "stoop", kind: "stoop", x: 6, y: 3, w: 1, h: 1 },
    { id: "subway", kind: "subway", x: 14, y: 13, w: 2, h: 2, label: "L · Myrtle–Wyckoff" },
    { id: "cart", kind: "cart", x: 2, y: 7, w: 1, h: 1, label: "Halal cart" },
    { id: "tree-1", kind: "tree", x: 4, y: 5, w: 1, h: 1 },
    { id: "tree-2", kind: "tree", x: 11, y: 5, w: 1, h: 1 },
    { id: "bench", kind: "bench", x: 8, y: 5, w: 2, h: 1 },
    { id: "hydrant", kind: "hydrant", x: 13, y: 4, w: 1, h: 1 },
    { id: "lamp-1", kind: "lamp", x: 1, y: 4, w: 1, h: 1 },
    { id: "lamp-2", kind: "lamp", x: 15, y: 9, w: 1, h: 1 },
  ],
};

export const ROOMS: Record<string, RoomDef> = { [BUSHWICK_BLOCK.id]: BUSHWICK_BLOCK };

export function blockedTiles(room: RoomDef): Set<string> {
  const out = new Set<string>();
  for (const p of room.props) {
    for (let dx = 0; dx < p.w; dx++) for (let dy = 0; dy < p.h; dy++) out.add(`${p.x + dx},${p.y + dy}`);
  }
  return out;
}
