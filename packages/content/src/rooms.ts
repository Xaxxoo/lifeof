/**
 * Room layouts. A room is a tile grid; props block tiles and tell the renderer what to draw.
 * M0 ships one public street block. Coordinates: x runs east, y runs south.
 */
export type PropKind = "building" | "stoop" | "tree" | "bench" | "cart" | "hydrant" | "subway" | "lamp";

export interface Prop {
  id: string;
  kind: PropKind | "door";
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  /** Action ids from ACTIONS this prop offers when tapped. */
  actions?: string[];
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
  kind: "street" | "home";
}

export const BUSHWICK_BLOCK: RoomDef = {
  id: "bushwick-block",
  name: "Knickerbocker Ave",
  neighborhood: "Bushwick",
  width: 16,
  height: 16,
  spawn: { x: 8, y: 12 },
  capacity: 30,
  kind: "street",
  props: [
    { id: "bodega", kind: "building", x: 0, y: 0, w: 4, h: 3, label: "Bodega 24/7", color: "#c0392b", actions: ["bodega_bec", "bodega_coffee"] },
    { id: "walkup", kind: "building", x: 4, y: 0, w: 5, h: 3, label: "Walk-up · your room", color: "#8e4a35", actions: ["go_home"] },
    { id: "barber", kind: "building", x: 9, y: 0, w: 3, h: 3, label: "Barbershop", color: "#2c3e50", actions: ["haircut"] },
    { id: "laundromat", kind: "building", x: 12, y: 0, w: 4, h: 3, label: "Laundromat", color: "#3d6b8f", actions: ["laundry"] },
    { id: "stoop", kind: "stoop", x: 6, y: 3, w: 1, h: 1, actions: ["go_home"] },
    { id: "subway", kind: "subway", x: 14, y: 13, w: 2, h: 2, label: "L · Myrtle–Wyckoff", actions: ["go_to_work"] },
    { id: "cart", kind: "cart", x: 2, y: 7, w: 1, h: 1, label: "Halal cart", actions: ["halal"] },
    { id: "tree-1", kind: "tree", x: 4, y: 5, w: 1, h: 1 },
    { id: "tree-2", kind: "tree", x: 11, y: 5, w: 1, h: 1 },
    { id: "bench", kind: "bench", x: 8, y: 5, w: 2, h: 1, actions: ["people_watch"] },
    { id: "hydrant", kind: "hydrant", x: 13, y: 4, w: 1, h: 1 },
    { id: "lamp-1", kind: "lamp", x: 1, y: 4, w: 1, h: 1 },
    { id: "lamp-2", kind: "lamp", x: 15, y: 9, w: 1, h: 1 },
  ],
};

export const STREET_ID = BUSHWICK_BLOCK.id;
/** Where you appear on the street after coming out of your building or off the train. */
export const STREET_ARRIVALS = { home: { x: 6, y: 4 }, subway: { x: 13, y: 13 } } as const;

/**
 * Tier 1 housing: a shared basement room in Crown Heights (PRD §6.5). One private instance per player.
 * Walls run along the north (y = 0) and west (x = 0) edges; the door is on the west wall.
 */
export const BASEMENT_ROOM: RoomDef = {
  id: "home-basement",
  name: "Basement room",
  neighborhood: "Crown Heights",
  width: 8,
  height: 8,
  spawn: { x: 1, y: 6 },
  capacity: 8,
  kind: "home",
  props: [{ id: "door", kind: "door", x: 0, y: 6, w: 1, h: 1, label: "Door", actions: ["go_out"] }],
};

/** Starter furniture for a new basement room: itemId, x, y, rot. */
export const BASEMENT_STARTER: { itemId: string; x: number; y: number; rot: number }[] = [
  { itemId: "air-mattress", x: 6, y: 1, rot: 0 },
  { itemId: "mini-fridge", x: 1, y: 1, rot: 0 },
  { itemId: "hot-plate", x: 2, y: 1, rot: 0 },
  { itemId: "toilet", x: 6, y: 6, rot: 0 },
  { itemId: "shower-stall", x: 7, y: 6, rot: 0 },
];

export const HOME_RENT_PER_WEEK = 180;

export const ROOMS: Record<string, RoomDef> = { [BUSHWICK_BLOCK.id]: BUSHWICK_BLOCK };

export const homeRoomId = (characterId: string) => `home:${characterId}`;
export const isHomeRoom = (roomId: string) => roomId.startsWith("home:");

/** Room layout for any room id, including private homes. */
export function roomDef(roomId: string): RoomDef | null {
  if (isHomeRoom(roomId)) return { ...BASEMENT_ROOM, id: roomId };
  return ROOMS[roomId] ?? null;
}

export function blockedTiles(room: RoomDef): Set<string> {
  const out = new Set<string>();
  for (const p of room.props) {
    for (let dx = 0; dx < p.w; dx++) for (let dy = 0; dy < p.h; dy++) out.add(`${p.x + dx},${p.y + dy}`);
  }
  return out;
}
