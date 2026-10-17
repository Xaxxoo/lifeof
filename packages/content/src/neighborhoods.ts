import { DISTRICTS, type Architecture, type DistrictStyle } from "./districts";
import { NEIGHBORHOOD_MAP, ROOMS, STREETS, street, type BuildingSpec, type Prop, type RoomDef, type ShopKind } from "./rooms";

/**
 * Player-built neighborhoods. Anyone can found a real New York neighborhood the game doesn't have yet,
 * pick its street, and open it up: the block appears on the subway map with six empty lots. Players buy
 * a lot, build a storefront (name, kind of shop, color, building style) and earn a cut of every sale.
 */

export const LOTS_PER_BLOCK = 6;
export const LOT_WIDTH = 4;
/** Founding a neighborhood. The founder's first lot comes free. */
export const FOUND_COST = 1500;
export const LOT_COST = 400;
/** Building a storefront on your lot, or redesigning it. */
export const BUILD_COST = 300;
/** Most lots one player can own, so a block stays a neighborhood and not one person's mall. */
export const MAX_LOTS_PER_PLAYER = 2;
/** What a shop's owner keeps of each sale; the rest is the city's cut. */
export const OWNER_SHARE = 0.7;
export const SHOP_NAME_MIN = 3;
export const SHOP_NAME_MAX = 24;

export type ShopTemplateId =
  | "restaurant"
  | "cafe"
  | "bodega"
  | "bar"
  | "barber"
  | "salon"
  | "boutique"
  | "records"
  | "bookstore"
  | "gallery"
  | "gym"
  | "tattoo";

export interface ShopTemplate {
  id: ShopTemplateId;
  label: string;
  emoji: string;
  inside: ShopKind;
  actions: string[];
  tags: Prop["tags"];
}

/** What you can open on your lot. Each kind comes with its interior and what customers can buy. */
export const SHOP_TEMPLATES: Record<ShopTemplateId, ShopTemplate> = {
  restaurant: { id: "restaurant", label: "Restaurant", emoji: "🍲", inside: "food", actions: ["pb_plate"], tags: ["food", "business"] },
  cafe: { id: "cafe", label: "Café", emoji: "☕", inside: "food", actions: ["pb_coffee", "pb_pastry"], tags: ["food", "business"] },
  bodega: { id: "bodega", label: "Bodega", emoji: "🥪", inside: "market", actions: ["bodega_bec", "bodega_coffee", "snacks"], tags: ["food"] },
  bar: { id: "bar", label: "Bar", emoji: "🍹", inside: "food", actions: ["order_drink", "shots"], tags: ["business"] },
  barber: { id: "barber", label: "Barbershop", emoji: "💈", inside: "barber", actions: ["haircut"], tags: ["business"] },
  salon: { id: "salon", label: "Braiding salon", emoji: "💇🏾", inside: "salon", actions: ["braids"], tags: ["business"] },
  boutique: { id: "boutique", label: "Boutique", emoji: "🧥", inside: "market", actions: ["pb_shop"], tags: ["business"] },
  records: { id: "records", label: "Record store", emoji: "💿", inside: "records", actions: ["pb_vinyl", "records"], tags: ["business"] },
  bookstore: { id: "bookstore", label: "Bookstore", emoji: "📚", inside: "library", actions: ["pb_book", "read_book"], tags: ["business"] },
  gallery: { id: "gallery", label: "Gallery", emoji: "🖼️", inside: "gallery", actions: ["look_art"], tags: ["business"] },
  gym: { id: "gym", label: "Gym", emoji: "🏋🏾", inside: "gym", actions: ["spin_class"], tags: ["business"] },
  tattoo: { id: "tattoo", label: "Tattoo shop", emoji: "🖋️", inside: "tattoo", actions: ["tattoo"], tags: ["business"] },
};

export const SHOP_TEMPLATE_IDS = Object.keys(SHOP_TEMPLATES) as ShopTemplateId[];

export const FACADE_COLORS = ["#c0392b", "#e67e22", "#f3c623", "#2a9d8f", "#3d6b8f", "#6d597a", "#9b5de5", "#ff4fa0", "#2f5d3a", "#1d1f24", "#e9e4da", "#8a5a3a"];
export const FACADE_STYLES: Architecture[] = ["rowhouse", "brownstone", "tenement", "warehouse", "loft", "glass"];

export interface FoundableNeighborhood {
  id: string;
  name: string;
  borough: "Brooklyn" | "Manhattan";
  /** Real streets in the neighborhood; the founder picks one. */
  streets: string[];
  station: { name: string; lines: string[] };
  map: { x: number; y: number };
  style: DistrictStyle;
  pitch: string;
}

const look = (base: string, over: Partial<DistrictStyle>): DistrictStyle => ({ ...DISTRICTS[base]!, landmarks: [], ...over });

/** Real neighborhoods the game doesn't have yet. Each can be founded once. */
export const FOUNDABLE: FoundableNeighborhood[] = [
  {
    id: "red-hook", name: "Red Hook", borough: "Brooklyn",
    streets: ["Van Brunt St", "Columbia St", "Conover St"],
    station: { name: "Smith–9 Sts", lines: ["F", "G"] },
    map: { x: -0.1, y: 4.2 },
    style: look("bushwick-block", { road: "cobble", waterfront: true, decor: ["murals", "stringlights"] }),
    pitch: "Cobblestones, old warehouses and the best view of the Statue of Liberty from Brooklyn.",
  },
  {
    id: "greenpoint", name: "Greenpoint", borough: "Brooklyn",
    streets: ["Manhattan Ave", "Franklin St", "Nassau Ave"],
    station: { name: "Greenpoint Av", lines: ["G"] },
    map: { x: 4.0, y: -0.5 },
    style: look("flatbush", { architecture: "tenement", decor: ["flags", "planters"], skyline: { min: 2, max: 4.5, towers: 0.05, trees: 0.12 } }),
    pitch: "Polish bakeries, vinyl-sided row houses and the Pulaski Bridge.",
  },
  {
    id: "fort-greene", name: "Fort Greene", borough: "Brooklyn",
    streets: ["DeKalb Ave", "Fulton St", "Lafayette Ave"],
    station: { name: "DeKalb Av", lines: ["B", "Q", "R"] },
    map: { x: 2.0, y: 3.1 },
    style: look("bed-stuy", {}),
    pitch: "Brownstones around the park, Saturday flea market, Spike Lee's old block.",
  },
  {
    id: "park-slope", name: "Park Slope", borough: "Brooklyn",
    streets: ["5th Ave", "7th Ave", "Union St"],
    station: { name: "7 Av", lines: ["F", "G"] },
    map: { x: 1.3, y: 4.6 },
    style: look("bed-stuy", { decor: ["planters", "stringlights"] }),
    pitch: "Strollers, brownstones and the food co-op everyone has an opinion about.",
  },
  {
    id: "sunset-park", name: "Sunset Park", borough: "Brooklyn",
    streets: ["8th Ave", "5th Ave", "4th Ave"],
    station: { name: "36 St", lines: ["D", "N", "R"] },
    map: { x: 0.9, y: 7.2 },
    style: look("chinatown", { decor: ["lanterns", "flags", "neon"] }),
    pitch: "Brooklyn's Chinatown on 8th Ave, taquerias on 5th, and the skyline from the hill.",
  },
  {
    id: "east-village", name: "East Village", borough: "Manhattan",
    streets: ["St. Marks Pl", "Avenue A", "2nd Ave"],
    station: { name: "1 Av", lines: ["L"] },
    map: { x: -1.0, y: -1.1 },
    style: look("lower-east-side", { decor: ["neon", "graffiti", "scaffolding"] }),
    pitch: "Punk history, dollar dumplings, and bars that have been closing for 40 years.",
  },
  {
    id: "soho", name: "SoHo", borough: "Manhattan",
    streets: ["Prince St", "Spring St", "Greene St"],
    station: { name: "Prince St", lines: ["R", "W"] },
    map: { x: -2.4, y: -0.1 },
    style: look("dumbo", { road: "cobble", waterfront: false, decor: ["flags"] }),
    pitch: "Cast-iron lofts, cobblestones and every flagship store in the world.",
  },
  {
    id: "tribeca", name: "Tribeca", borough: "Manhattan",
    streets: ["Franklin St", "Hudson St", "Greenwich St"],
    station: { name: "Franklin St", lines: ["1"] },
    map: { x: -3.3, y: 1.6 },
    style: look("dumbo", { road: "cobble", waterfront: false, decor: ["planters"] }),
    pitch: "Warehouse lofts, film festival crowds and the Ghostbusters firehouse.",
  },
];

export const FOUNDABLE_BY_ID: Record<string, FoundableNeighborhood> = Object.fromEntries(FOUNDABLE.map((n) => [n.id, n]));

export interface PlayerShop {
  name: string;
  template: ShopTemplateId;
  color: string;
  arch: Architecture;
}

export interface PlayerLot {
  index: number;
  ownerId: string | null;
  ownerName: string | null;
  shop: PlayerShop | null;
}

/** A founded neighborhood as the API sends it. */
export interface PlayerBlockDoc {
  id: string;
  street: string;
  founderId: string;
  founderName: string;
  lots: PlayerLot[];
}

/** Prop id of a lot on its block. */
export const lotPropId = (index: number) => `lot-${index + 1}`;
/** The interior of a lot's shop. */
export const lotShopRoomId = (blockId: string, index: number) => `shop:${blockId}:${lotPropId(index)}`;

/** Build a founded neighborhood's street block and its shops' interiors. */
export function playerBlockRooms(doc: PlayerBlockDoc): { street: RoomDef; shops: RoomDef[] } | null {
  const hood = FOUNDABLE_BY_ID[doc.id];
  if (!hood) return null;
  const lots = [...doc.lots].sort((a, b) => a.index - b.index);
  const buildings: BuildingSpec[] = lots.map((lot) => {
    const id = lotPropId(lot.index);
    if (lot.shop) {
      const t = SHOP_TEMPLATES[lot.shop.template];
      return {
        id,
        label: `${lot.shop.name}${lot.ownerName ? ` (by ${lot.ownerName})` : ""}`,
        w: LOT_WIDTH,
        color: lot.shop.color,
        arch: lot.shop.arch,
        actions: t.actions,
        tags: t.tags,
        inside: t.inside,
      };
    }
    return {
      id,
      label: lot.ownerId ? `${lot.ownerName ?? "Someone"}'s lot · coming soon` : `Lot ${lot.index + 1} · for sale`,
      w: LOT_WIDTH,
      color: "#6b6b70",
      actions: ["lot_open"],
      vacant: true,
    };
  });
  const shops: RoomDef[] = [];
  const room = street(
    {
      id: hood.id,
      name: doc.street,
      neighborhood: hood.name,
      station: hood.station,
      buildings,
      extras: [
        { id: "founder", kind: "bench", x: 9, y: 5, w: 2, h: 1, label: `Founder's bench · ${doc.founderName}`, actions: ["people_watch"], tags: ["outdoor"] },
        { id: "tree-1", kind: "tree", x: 4, y: 5, w: 1, h: 1, tags: ["outdoor"] },
        { id: "tree-2", kind: "tree", x: 15, y: 5, w: 1, h: 1, tags: ["outdoor"] },
        { id: "lamp-1", kind: "lamp", x: 2, y: 6, w: 1, h: 1 },
        { id: "lamp-2", kind: "lamp", x: 19, y: 6, w: 1, h: 1 },
        { id: "hydrant", kind: "hydrant", x: 12, y: 4, w: 1, h: 1 },
      ],
    },
    shops,
  );
  return { street: room, shops };
}

/** Which player block each registered room came from, so a re-register can drop stale shops. */
const registered = new Map<string, string[]>();

/**
 * Put founded neighborhoods into the world so every lookup (rooms, the subway, the maps) sees them.
 * Called by the API on boot and after each change, and by the client when the list arrives.
 */
export function registerPlayerBlocks(docs: PlayerBlockDoc[]) {
  const keep = new Set(docs.map((d) => d.id));
  for (const [id, roomIds] of registered) {
    if (keep.has(id)) continue;
    for (const r of roomIds) delete ROOMS[r];
    const i = STREETS.findIndex((s) => s.id === id);
    if (i >= 0) STREETS.splice(i, 1);
    delete NEIGHBORHOOD_MAP[id];
    registered.delete(id);
  }
  for (const doc of docs) {
    const built = playerBlockRooms(doc);
    if (!built) continue;
    for (const r of registered.get(doc.id) ?? []) delete ROOMS[r];
    ROOMS[built.street.id] = built.street;
    for (const s of built.shops) ROOMS[s.id] = s;
    const i = STREETS.findIndex((s) => s.id === doc.id);
    if (i >= 0) STREETS[i] = built.street;
    else STREETS.push(built.street);
    const hood = FOUNDABLE_BY_ID[doc.id]!;
    NEIGHBORHOOD_MAP[doc.id] = hood.map;
    DISTRICTS[doc.id] = hood.style;
    registered.set(doc.id, [built.street.id, ...built.shops.map((s) => s.id)]);
  }
}

/** Whether a room belongs to a player-built neighborhood. */
export const isPlayerBlock = (roomId: string) => registered.has(roomId);
