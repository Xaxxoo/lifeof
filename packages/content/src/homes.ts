import { BED_STUY, BUSHWICK, CROWN_HEIGHTS, FLATBUSH, type RoomDef } from "./rooms";

/**
 * Homes (PRD §6.5): rentals you move between, and empty lots you buy and build on from the ground up.
 * A home is a tile grid with walls on the edges between tiles, a floor per tile and one wall paint.
 */

/** A wall on the north ("n") or west ("w") edge of tile (x, y). y = height / x = width are the far sides. */
export interface WallSeg {
  x: number;
  y: number;
  side: "n" | "w";
  kind: "wall" | "door" | "window";
}

export interface HomeLayout {
  width: number;
  height: number;
  walls: WallSeg[];
  /** Floor per tile ("x,y" → floor id). Tiles left out use baseFloor. */
  floors: Record<string, string>;
  /** null = bare ground (an unbuilt lot). */
  baseFloor: string | null;
  paint: string;
}

export interface PaintDef {
  id: string;
  name: string;
  color: string;
  price: number;
}

export interface FloorDef {
  id: string;
  name: string;
  color: string;
  alt: string;
  pattern: "plank" | "tile" | "check" | "stone";
  price: number;
  /** Bathroom and kitchen tiles come with rentals and can't be bought. */
  fixed?: boolean;
}

export const PAINTS: PaintDef[] = [
  { id: "cream", name: "Prewar Cream", color: "#e9dfcc", price: 0 },
  { id: "white", name: "Landlord White", color: "#f2f0ea", price: 30 },
  { id: "sage", name: "Prospect Sage", color: "#a9bfa0", price: 45 },
  { id: "sky", name: "Coney Sky", color: "#9cc3df", price: 45 },
  { id: "peach", name: "Bodega Peach", color: "#f0b796", price: 45 },
  { id: "lilac", name: "Dusk Lilac", color: "#b9a4d6", price: 45 },
  { id: "brick", name: "Brownstone Red", color: "#a8553f", price: 60 },
  { id: "mustard", name: "Taxi Mustard", color: "#e2b543", price: 60 },
  { id: "navy", name: "Harbor Navy", color: "#2f4466", price: 70 },
  { id: "charcoal", name: "Subway Charcoal", color: "#43434b", price: 80 },
];

export const FLOORS: FloorDef[] = [
  { id: "oak", name: "Oak planks", color: "#b88a5c", alt: "#ae8254", pattern: "plank", price: 0 },
  { id: "walnut", name: "Walnut planks", color: "#7a5238", alt: "#714b33", pattern: "plank", price: 120 },
  { id: "whiteoak", name: "Whitewashed oak", color: "#d9c9ad", alt: "#d0c0a4", pattern: "plank", price: 150 },
  { id: "terrazzo", name: "Terrazzo", color: "#d8d2c6", alt: "#cfc8bb", pattern: "stone", price: 180 },
  { id: "checker", name: "Diner checkerboard", color: "#f1ede4", alt: "#2b2b30", pattern: "check", price: 160 },
  { id: "marble", name: "White marble", color: "#eeeae4", alt: "#e2ddd5", pattern: "stone", price: 300 },
  { id: "blackmarble", name: "Black marble", color: "#2c2c31", alt: "#35353b", pattern: "stone", price: 340 },
  { id: "bluetile", name: "Blue ceramic", color: "#8fb3d1", alt: "#84a8c6", pattern: "tile", price: 140 },
  { id: "terracotta", name: "Terracotta", color: "#c47a52", alt: "#b9714b", pattern: "tile", price: 130 },
  { id: "carpet", name: "Plum carpet", color: "#6e4a74", alt: "#6a4770", pattern: "stone", price: 110 },
  { id: "kitchen-tile", name: "Kitchen tile", color: "#e6e2d8", alt: "#d6d1c5", pattern: "check", price: 0, fixed: true },
  { id: "bath-tile", name: "Bathroom tile", color: "#dfe9ee", alt: "#cfdde4", pattern: "tile", price: 0, fixed: true },
];

export const PAINT_BY_ID: Record<string, PaintDef> = Object.fromEntries(PAINTS.map((p) => [p.id, p]));
export const FLOOR_BY_ID: Record<string, FloorDef> = Object.fromEntries(FLOORS.map((f) => [f.id, f]));

/** What building costs on your own lot, per wall segment or floor tile. Erasing refunds half. */
export const BUILD_PRICES = { wall: 40, door: 120, window: 90, floor: 15 } as const;
export const BUILD_REFUND_RATE = 0.5;

// ── Layout helpers ──────────────────────────────────────────────────────────
const hWall = (y: number, x0: number, x1: number, doors: number[] = [], windows: number[] = []): WallSeg[] =>
  range(x0, x1).map((x) => ({ x, y, side: "n" as const, kind: doors.includes(x) ? "door" : windows.includes(x) ? "window" : "wall" }));
const vWall = (x: number, y0: number, y1: number, doors: number[] = [], windows: number[] = []): WallSeg[] =>
  range(y0, y1).map((y) => ({ x, y, side: "w" as const, kind: doors.includes(y) ? "door" : windows.includes(y) ? "window" : "wall" }));

/** Outer walls with the front door on the west wall at y = height − 2. */
function perimeter(w: number, h: number, backWindows: number[] = [], sideWindows: number[] = []): WallSeg[] {
  return [
    ...hWall(0, 0, w, [], backWindows),
    ...vWall(0, 0, h, [h - 2], sideWindows),
    ...hWall(h, 0, w),
    ...vWall(w, 0, h),
  ];
}

function zone(x0: number, y0: number, x1: number, y1: number, floor: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) out[`${x},${y}`] = floor;
  return out;
}

function range(a: number, b: number) {
  return Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
}

// ── Rentals ─────────────────────────────────────────────────────────────────
export interface HomeTier {
  id: string;
  name: string;
  neighborhood: string;
  rentPerWeek: number;
  /** Paid to the landlord (and the broker) when you move in. */
  moveIn: number;
  layout: HomeLayout;
  /** Where you step out onto the street. */
  exitTo: NonNullable<RoomDef["exitTo"]>;
  blurb: string;
}

export const HOME_TIERS: HomeTier[] = [
  {
    id: "basement",
    name: "Basement room",
    neighborhood: "Crown Heights",
    rentPerWeek: 180,
    moveIn: 0,
    blurb: "Low ceiling, one window, your own bathroom. A start.",
    exitTo: { roomId: CROWN_HEIGHTS.id, at: CROWN_HEIGHTS.arrivals!.home! },
    layout: {
      width: 8,
      height: 8,
      walls: [...perimeter(8, 8, [3]), ...vWall(6, 5, 8, [5]), ...hWall(5, 6, 8)],
      floors: { ...zone(1, 0, 3, 2, "kitchen-tile"), ...zone(6, 5, 8, 8, "bath-tile") },
      baseFloor: "oak",
      paint: "cream",
    },
  },
  {
    id: "studio",
    name: "Studio walk-up",
    neighborhood: "Bed-Stuy",
    rentPerWeek: 320,
    moveIn: 640,
    blurb: "Two windows and a real kitchen corner. Fourth floor, no elevator.",
    exitTo: { roomId: BED_STUY.id, at: { x: 3, y: 4 } },
    layout: {
      width: 10,
      height: 8,
      walls: [...perimeter(10, 8, [3, 6]), ...vWall(7, 5, 8, [6]), ...hWall(5, 7, 10)],
      floors: { ...zone(1, 0, 5, 2, "kitchen-tile"), ...zone(7, 5, 10, 8, "bath-tile") },
      baseFloor: "oak",
      paint: "cream",
    },
  },
  {
    id: "one-bed",
    name: "One-bedroom",
    neighborhood: "Bed-Stuy",
    rentPerWeek: 650,
    moveIn: 1300,
    blurb: "A door you can close. A living room for people to sit in.",
    exitTo: { roomId: BED_STUY.id, at: { x: 14, y: 4 } },
    layout: {
      width: 12,
      height: 10,
      walls: [
        ...perimeter(12, 10, [2, 4, 9]),
        ...vWall(7, 0, 5, [3]),
        ...hWall(5, 7, 12),
        ...vWall(9, 7, 10, [8]),
        ...hWall(7, 9, 12),
      ],
      floors: { ...zone(1, 0, 5, 2, "kitchen-tile"), ...zone(9, 7, 12, 10, "bath-tile"), ...zone(7, 0, 12, 5, "carpet") },
      baseFloor: "oak",
      paint: "cream",
    },
  },
  {
    id: "brownstone",
    name: "Brownstone floor-through",
    neighborhood: "Bed-Stuy",
    rentPerWeek: 1400,
    moveIn: 2800,
    blurb: "Parlor floor, two bedrooms, original moldings. You've made it, sort of.",
    exitTo: { roomId: BED_STUY.id, at: { x: 3, y: 4 } },
    layout: {
      width: 14,
      height: 12,
      walls: [
        ...perimeter(14, 12, [2, 5, 11], [3]),
        ...vWall(9, 0, 5, [4]),
        ...hWall(5, 9, 14),
        ...vWall(9, 5, 9, [6]),
        ...hWall(9, 9, 14),
        ...vWall(10, 9, 12, [10]),
      ],
      floors: { ...zone(1, 0, 6, 2, "kitchen-tile"), ...zone(10, 9, 14, 12, "bath-tile") },
      baseFloor: "walnut",
      paint: "white",
    },
  },
];

export const TIER_BY_ID: Record<string, HomeTier> = Object.fromEntries(HOME_TIERS.map((t) => [t.id, t]));

/** Starter furniture for a new arrival's basement room. */
export const BASEMENT_STARTER: { itemId: string; x: number; y: number; rot: number }[] = [
  { itemId: "air-mattress", x: 4, y: 1, rot: 0 },
  { itemId: "mini-fridge", x: 1, y: 0, rot: 0 },
  { itemId: "hot-plate", x: 2, y: 0, rot: 0 },
  { itemId: "toilet", x: 7, y: 5, rot: 0 },
  { itemId: "shower-stall", x: 7, y: 7, rot: 0 },
];

// ── Land ────────────────────────────────────────────────────────────────────
export interface LotDef {
  id: string;
  name: string;
  neighborhood: string;
  width: number;
  height: number;
  price: number;
  exitTo: NonNullable<RoomDef["exitTo"]>;
  blurb: string;
}

export const LOTS: LotDef[] = [
  {
    id: "lot-flatbush",
    name: "Empty lot off Linden Blvd",
    neighborhood: "Flatbush",
    width: 12,
    height: 10,
    price: 6000,
    exitTo: { roomId: FLATBUSH.id, at: FLATBUSH.arrivals!.subway! },
    blurb: "A chain-link fence, a mattress, and potential.",
  },
  {
    id: "lot-bushwick",
    name: "Corner lot on Wyckoff",
    neighborhood: "Bushwick",
    width: 14,
    height: 12,
    price: 14000,
    exitTo: { roomId: BUSHWICK.id, at: BUSHWICK.arrivals!.subway! },
    blurb: "Zoned for whatever you can get away with.",
  },
  {
    id: "lot-bedstuy",
    name: "Brownstone lot on Halsey",
    neighborhood: "Bed-Stuy",
    width: 16,
    height: 14,
    price: 32000,
    exitTo: { roomId: BED_STUY.id, at: BED_STUY.arrivals!.subway! },
    blurb: "The one empty lot on the block. The neighbors are watching.",
  },
];

export const LOT_BY_ID: Record<string, LotDef> = Object.fromEntries(LOTS.map((l) => [l.id, l]));

/** A freshly bought lot: bare ground, no walls. You build everything. */
export function emptyLotLayout(lot: LotDef): HomeLayout {
  return { width: lot.width, height: lot.height, walls: [], floors: {}, baseFloor: null, paint: "cream" };
}

/** Everything the client and server need to know about one home, as stored. */
export interface HomeInfo {
  id: string;
  kind: "rental" | "lot";
  /** Tier id for rentals, lot id for lots. */
  defId: string;
  layout: HomeLayout;
}

export const homeRoom = (homeId: string) => `home:${homeId}`;

/** The playable room for a home: its grid, walls, floors and front door. */
export function homeRoomDef(roomId: string, home: HomeInfo): RoomDef {
  const def = home.kind === "rental" ? TIER_BY_ID[home.defId] : LOT_BY_ID[home.defId];
  const { width, height } = home.layout;
  const door = { x: 0, y: height - 2 };
  return {
    id: roomId,
    name: def?.name ?? "Home",
    neighborhood: def?.neighborhood ?? "Brooklyn",
    width,
    height,
    spawn: { x: 1, y: door.y },
    capacity: 8,
    kind: "home",
    exitTo: def?.exitTo ?? { roomId: CROWN_HEIGHTS.id, at: CROWN_HEIGHTS.arrivals!.home! },
    theme: { floor: "#a47d55", floorAlt: "#9c7650", wall: PAINT_BY_ID[home.layout.paint]?.color ?? "#e9dfcc", light: "#ffd9a0" },
    props: [{ id: "door", kind: "door", x: door.x, y: door.y, w: 1, h: 1, label: home.kind === "lot" ? "Gate" : "Door", actions: ["go_out"] }],
    home: { kind: home.kind, layout: home.layout },
  };
}

/** Edge keys (as used by the pathfinder) that block walking: walls and windows, not doors. */
export function wallEdges(walls: WallSeg[]): Set<string> {
  return new Set(walls.filter((w) => w.kind !== "door").map((w) => `${w.x},${w.y},${w.side}`));
}
