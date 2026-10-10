import type { Look } from "./traits";

/**
 * Room layouts (PRD §8). A room is a tile grid; props block tiles and tell the renderer what to draw.
 * Coordinates: x runs east, y runs south. Commercial venues use parody names; landmarks use real ones.
 */
export type PropKind =
  | "building" | "stoop" | "tree" | "bench" | "cart" | "hydrant" | "subway" | "lamp" | "door"
  | "counter" | "stool" | "dancefloor" | "djbooth" | "table"
  | "lawn" | "grill" | "drumcircle" | "stall" | "track" | "photospot"
  | "shelf" | "longtable" | "salonchair" | "washer" | "bike" | "crate" | "artwall" | "bookshelf"
  | "pew" | "altar" | "stage" | "lane";

/** Tags let gigs pick sensible stops: pick up food at "food", drop off at "residential". */
export type PropTag = "food" | "residential" | "outdoor" | "business" | "vendor";

export interface OpenHours {
  /** NYC hours; close may be past midnight. */
  open: number;
  close: number;
  /** 0 = Sunday … 6 = Saturday. Omitted = every day. */
  days?: number[];
}

export interface Prop {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  /** Action ids from ACTIONS this prop offers when tapped. */
  actions?: string[];
  /** Room id this building lets you enter. */
  enter?: string;
  tags?: PropTag[];
  /** Flat props (lawns, dance floors) you walk onto instead of beside. */
  walkable?: boolean;
  open?: OpenHours;
  /** One of a row (washers, bikes): usable, but only the first one gets a sign. */
  signless?: boolean;
}

export interface Npc {
  id: string;
  name: string;
  role: string;
  look: Look;
  x: number;
  y: number;
  /** Radians, 0 = facing +z (south). */
  facing: number;
  lines: string[];
  /** Players from the same place can "talk about home" with them. */
  origin?: string;
  /** Loops this route forever instead of standing still. Ambient only. */
  patrol?: { x: number; y: number }[];
}

export interface RoomDef {
  id: string;
  name: string;
  neighborhood: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  capacity: number;
  kind: "street" | "park" | "home" | "venue";
  props: Prop[];
  npcs?: Npc[];
  /** Where you appear when arriving by train or coming out of your building. */
  arrivals?: { subway?: { x: number; y: number }; home?: { x: number; y: number } };
  /** Interiors: where the door leads. */
  exitTo?: { roomId: string; at: { x: number; y: number } };
  open?: OpenHours;
  /** Subway station on this block. */
  station?: { name: string; lines: string[] };
  /** Interior colors. */
  theme?: { floor: string; floorAlt: string; wall: string; light: string };
  /** Homes: walls, floors and paint (see homes.ts). */
  home?: { kind: "rental" | "lot"; layout: import("./homes").HomeLayout };
}

// ── Looks for NPCs ──────────────────────────────────────────────────────────
const look = (skin: string, hair: Look["hair"], shirt: string, pants = "#26324a", hairColor = "#1a1410"): Look => ({
  skin,
  hair,
  shirt,
  pants,
  hairColor,
});

// ── Street block builder ────────────────────────────────────────────────────
interface BuildingSpec {
  id: string;
  label: string;
  w: number;
  color: string;
  actions?: string[];
  enter?: string;
  tags?: PropTag[];
  open?: OpenHours;
  /** Gives the shop a walk-in interior where its actions happen. */
  inside?: ShopKind;
}

type ShopKind = "food" | "market" | "hall" | "barber" | "salon" | "laundry" | "gym" | "records" | "gallery" | "library" | "church" | "theater";

const SHOP_THEME: Record<ShopKind, NonNullable<RoomDef["theme"]>> = {
  food: { floor: "#c9a27a", floorAlt: "#c09a72", wall: "#f2e6d0", light: "#ffcf7a" },
  market: { floor: "#d8d2c4", floorAlt: "#d0cabc", wall: "#e9edf0", light: "#e6f4ff" },
  hall: { floor: "#9c7a55", floorAlt: "#94734f", wall: "#efe6d8", light: "#ffd9a0" },
  barber: { floor: "#3a3a40", floorAlt: "#e8e8e8", wall: "#dfe7ee", light: "#bfe3ff" },
  salon: { floor: "#e7c9d9", floorAlt: "#dfc0d0", wall: "#fbe8f2", light: "#ff9ad5" },
  laundry: { floor: "#dfe6ea", floorAlt: "#d6dde1", wall: "#cfe3ef", light: "#e6f4ff" },
  gym: { floor: "#2b2b30", floorAlt: "#26262b", wall: "#3a3a42", light: "#7cf5ff" },
  records: { floor: "#5b3f2e", floorAlt: "#543a2a", wall: "#264653", light: "#ffb347" },
  gallery: { floor: "#e8e4dc", floorAlt: "#e1ddd5", wall: "#ffffff", light: "#fff6e6" },
  library: { floor: "#8a6a48", floorAlt: "#826443", wall: "#e9dcc4", light: "#ffe2a8" },
  church: { floor: "#7d2e2e", floorAlt: "#b8a888", wall: "#efe8dc", light: "#ffd9a0" },
  theater: { floor: "#5a1a22", floorAlt: "#521820", wall: "#2a1a24", light: "#ffc46b" },
};

/**
 * Inside a shop: 8×7 tiles, door on the west wall, and furniture for its kind. The shop's own actions
 * move onto the counter, chairs or machines; spare seats let you lounge.
 */
function shopInterior(streetId: string, b: BuildingSpec, front: { x: number; y: number }): RoomDef {
  const kind = b.inside!;
  const acts = b.actions ?? [];
  const name = b.label.replace(/\s*\(.*\)$/, "");
  const row = (id: string, k: PropKind, label: string, spots: [number, number][], actions: string[], w = 1, h = 1): Prop[] =>
    spots.map(([x, y], i) => ({ id: `${id}-${i + 1}`, kind: k, x, y, w, h, label, actions, signless: i > 0 }));
  const lounge = (spots: [number, number][]) => row("stool", "stool", "Seat", spots, ["lounge"]).map((p) => ({ ...p, label: undefined }));

  const furniture: Record<ShopKind, Prop[]> = {
    food: [
      { id: "counter", kind: "counter", x: 2, y: 0, w: 4, h: 1, label: "Counter", actions: acts },
      { id: "table-1", kind: "table", x: 3, y: 3, w: 1, h: 1 },
      { id: "table-2", kind: "table", x: 6, y: 3, w: 1, h: 1 },
      ...lounge([[2, 3], [5, 3], [3, 5], [6, 5]]),
    ],
    market: [
      { id: "counter", kind: "counter", x: 5, y: 0, w: 2, h: 1, label: "Register", actions: acts },
      { id: "shelf-1", kind: "shelf", x: 2, y: 2, w: 4, h: 1 },
      { id: "shelf-2", kind: "shelf", x: 2, y: 4, w: 4, h: 1 },
    ],
    hall: [
      { id: "table-1", kind: "longtable", x: 2, y: 2, w: 5, h: 1 },
      { id: "bench-1", kind: "bench", x: 2, y: 3, w: 5, h: 1, label: "Dinner table", actions: acts },
      { id: "table-2", kind: "longtable", x: 2, y: 5, w: 5, h: 1 },
      { id: "bench-2", kind: "bench", x: 2, y: 6, w: 5, h: 1, label: "Dinner table", actions: acts, signless: true },
    ],
    barber: [...row("chair", "salonchair", "Barber chair", [[2, 1], [4, 1], [6, 1]], acts), ...lounge([[3, 5], [5, 5]])],
    salon: [...row("chair", "salonchair", "Braiding chair", [[2, 1], [4, 1], [6, 1]], acts), ...lounge([[3, 5], [5, 5]])],
    laundry: [...row("washer", "washer", "Washers", [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], acts), ...lounge([[3, 3], [4, 3], [5, 3]])],
    gym: row("bike", "bike", "Spin bikes", [[2, 2], [4, 2], [6, 2], [2, 4], [4, 4], [6, 4]], acts),
    records: [
      ...row("crate", "crate", "Record crates", [[2, 2], [5, 2], [2, 4], [5, 4]], acts, 2),
      { id: "counter", kind: "counter", x: 6, y: 0, w: 2, h: 1 },
    ],
    gallery: [...row("art", "artwall", "Artwork", [[2, 0], [5, 0]], acts, 2), ...lounge([[3, 4], [4, 4]])],
    library: [
      ...row("shelf", "bookshelf", "Bookshelves", [[2, 0], [5, 0]], acts, 2),
      { id: "table", kind: "longtable", x: 2, y: 3, w: 4, h: 1 },
      ...row("seat", "stool", "Study table", [[2, 4], [3, 4], [4, 4], [5, 4]], acts),
    ],
    church: [
      { id: "altar", kind: "altar", x: 3, y: 0, w: 3, h: 1 },
      ...row("pew", "pew", "Pews", [[2, 2], [5, 2], [2, 4], [5, 4]], acts, 2).map((p) => ({ ...p, color: "#6b4a2e" })),
    ],
    theater: [
      { id: "stage", kind: "stage", x: 1, y: 0, w: 6, h: 2 },
      ...row("seats", "pew", "Seats", [[2, 3], [5, 3], [2, 5], [5, 5]], acts, 2).map((p) => ({ ...p, color: "#a3212f" })),
    ],
  };

  return {
    id: `shop:${streetId}:${b.id}`,
    name,
    neighborhood: "",
    width: 8,
    height: 7,
    spawn: { x: 1, y: 5 },
    capacity: 20,
    kind: "venue",
    open: b.open,
    exitTo: { roomId: streetId, at: front },
    theme: SHOP_THEME[kind],
    props: [{ id: "door", kind: "door", x: 0, y: 5, w: 1, h: 1, label: "Door", actions: ["go_out"] }, ...furniture[kind]],
  };
}

/** Every shop interior, filled in as the street blocks are built. */
export const SHOPS: RoomDef[] = [];

const SUBWAY = { x: 14, y: 13, w: 2, h: 2 };

/**
 * Every street block shares one layout: storefronts along the north (y 0–2), sidewalk (3–7), road (8–12),
 * far sidewalk (13–15) with the subway entrance in the corner.
 */
function street(spec: {
  id: string;
  name: string;
  neighborhood: string;
  buildings: BuildingSpec[];
  station: { name: string; lines: string[] };
  extras?: Prop[];
  npcs?: Npc[];
  home?: { x: number; y: number };
}): RoomDef {
  let x = 0;
  const props: Prop[] = spec.buildings.map((b) => {
    const p: Prop = { id: b.id, kind: "building", x, y: 0, w: b.w, h: 3, label: b.label, color: b.color, actions: b.actions, enter: b.enter, tags: b.tags, open: b.open };
    if (b.inside) {
      const shop = shopInterior(spec.id, b, { x: x + Math.floor(b.w / 2), y: 3 });
      SHOPS.push({ ...shop, neighborhood: spec.neighborhood });
      p.actions = ["enter_venue"];
      p.enter = shop.id;
    }
    x += b.w;
    return p;
  });
  // Blocks are as long as their storefronts; the subway always sits in the far corner.
  const width = Math.max(16, x);
  props.push({
    id: "subway",
    kind: "subway",
    ...SUBWAY,
    x: width - 2,
    label: `${spec.station.lines.join(" ")} · ${spec.station.name}`,
    actions: ["ride_subway", "go_to_work"],
  });
  props.push(...(spec.extras ?? []));
  return {
    id: spec.id,
    name: spec.name,
    neighborhood: spec.neighborhood,
    width,
    height: 16,
    spawn: { x: width - 3, y: 13 },
    capacity: 30,
    kind: "street",
    props,
    npcs: spec.npcs,
    arrivals: { subway: { x: width - 3, y: 13 }, home: spec.home },
    station: spec.station,
  };
}

const tree = (id: string, x: number, y: number): Prop => ({ id, kind: "tree", x, y, w: 1, h: 1, tags: ["outdoor"] });
const lamp = (id: string, x: number, y: number): Prop => ({ id, kind: "lamp", x, y, w: 1, h: 1 });
const bench = (id: string, x: number, y: number): Prop => ({
  id, kind: "bench", x, y, w: 2, h: 1, actions: ["people_watch"], tags: ["outdoor"],
});

// ── The seven launch neighborhoods (PRD §8) ────────────────────────────────
export const CROWN_HEIGHTS = street({
  id: "crown-heights",
  name: "Nostrand Ave",
  neighborhood: "Crown Heights",
  station: { name: "Franklin Av", lines: ["2", "3", "4", "5"] },
  home: { x: 1, y: 4 },
  buildings: [
    { id: "walkup", label: "Walk-up · your room", w: 4, color: "#8e4a35", actions: ["go_home"], tags: ["residential"] },
    { id: "patty", label: "Allan's Bakery", w: 3, color: "#f3a712", actions: ["patty"], tags: ["food"], inside: "food" },
    { id: "ghana-shop", label: "Ghanaian shop", w: 4, color: "#2a9d8f", actions: ["waakye"], tags: ["food", "business"], inside: "food" },
    { id: "church-hall", label: "First Baptist Church of Crown Heights", w: 5, color: "#6d597a", actions: ["community_dinner", "church_service"], tags: ["business"], inside: "church" },
    { id: "gees", label: "Gee's Caribbean", w: 4, color: "#d35400", actions: ["roti"], tags: ["food"], inside: "food" },
    { id: "library", label: "Crown Heights Library", w: 4, color: "#8d877d", actions: ["read_book", "coding_class"], tags: ["business"], inside: "library" },
  ],
  extras: [
    { id: "stoop", kind: "stoop", x: 1, y: 3, w: 1, h: 1, actions: ["go_home"] },
    tree("tree-1", 6, 5),
    tree("tree-2", 12, 5),
    bench("bench", 8, 5),
    lamp("lamp-1", 3, 6),
    lamp("lamp-2", 15, 9),
    { id: "hydrant", kind: "hydrant", x: 10, y: 4, w: 1, h: 1 },
    { id: "cart", kind: "cart", x: 4, y: 7, w: 1, h: 1, label: "Water ice cart", actions: ["snacks"], tags: ["food", "vendor"] },
  ],
  npcs: [
    { id: "grace", name: "Auntie Grace", role: "Runs the Ghanaian shop", origin: "accra", look: look("#4d2c1a", "headwrap", "#e0a526", "#7a4e3a", "#2a9d8f"),
      x: 9, y: 4, facing: 0, lines: ["You have eaten? Come, the waakye is hot.", "My son back home says I work too hard. He is right.", "Bring your friends on Sunday."] },
    { id: "desmond", name: "Desmond", role: "Cook at Allan's Bakery", origin: "kingston", look: look("#3e2416", "locs", "#2f5d3a"),
      x: 5, y: 4, facing: 0, lines: ["Beef or chicken? Don't say veggie, mi beg you.", "The coco bread is fresh, boss.", "Labor Day parade? You ready?"] },
    { id: "james", name: "Brother James", role: "Runs the church's community dinner", origin: "lagos", look: look("#311c11", "fade", "#29335c", "#1b1b1b"),
      x: 13, y: 4, facing: 0, lines: ["Community dinner every evening. Nobody eats alone.", "Long road to Brooklyn, but God is faithful.", "Have you called your mother this week?"] },
  ],
});

export const BUSHWICK = street({
  id: "bushwick-block",
  name: "Knickerbocker Ave",
  neighborhood: "Bushwick",
  station: { name: "Myrtle–Wyckoff", lines: ["L", "M"] },
  buildings: [
    { id: "bodega", label: "Bodega 24/7", w: 4, color: "#c0392b", actions: ["bodega_bec", "bodega_coffee"], tags: ["food"], inside: "market" },
    { id: "warehouse", label: "House of Yes (9 PM–4 AM)", w: 5, color: "#3a3d45", actions: ["enter_venue"], enter: "venue:warehouse", tags: ["business"] },
    { id: "barber", label: "Barbershop", w: 3, color: "#2c3e50", actions: ["haircut"], tags: ["business"], inside: "barber" },
    { id: "laundromat", label: "Laundromat", w: 4, color: "#3d6b8f", actions: ["laundry"], tags: ["business"], inside: "laundry" },
    { id: "library", label: "Bushwick Library", w: 4, color: "#9a8a72", actions: ["read_book", "coding_class"], tags: ["business"], inside: "library" },
    { id: "church", label: "St. Barbara's Church", w: 4, color: "#e8d9a8", actions: ["church_service"], tags: ["business"], inside: "church" },
  ],
  extras: [
    { id: "cart", kind: "cart", x: 2, y: 7, w: 1, h: 1, label: "Halal cart", actions: ["halal"], tags: ["food", "vendor"] },
    tree("tree-1", 4, 5),
    tree("tree-2", 11, 5),
    bench("bench", 8, 5),
    { id: "hydrant", kind: "hydrant", x: 13, y: 4, w: 1, h: 1 },
    lamp("lamp-1", 1, 4),
    lamp("lamp-2", 15, 9),
  ],
  npcs: [
    { id: "tito", name: "Tito", role: "Bodega owner", origin: "santo-domingo", look: look("#b0714d", "waves", "#f3f3f3"),
      x: 3, y: 4, facing: 0, lines: ["The cat is the real manager. I just work here.", "BEC, salt pepper ketchup? Say less.", "Papi, the L is acting up again."] },
    { id: "luna", name: "Luna", role: "Muralist", look: look("#d9a47f", "bun", "#9b5de5", "#c9b79c", "#b5331f"),
      x: 7, y: 6, facing: Math.PI / 2, lines: ["That wall? Mine on Saturday.", "Bushwick was cheaper five years ago. Everything was.", "House of Yes tonight. The aerialists alone, trust me."] },
  ],
});

export const BED_STUY = street({
  id: "bed-stuy",
  name: "Halsey St",
  neighborhood: "Bed-Stuy",
  station: { name: "Nostrand Av", lines: ["A", "C"] },
  buildings: [
    { id: "brownstone-1", label: "Brownstone", w: 4, color: "#7a4e3a", actions: ["go_home"], tags: ["residential"] },
    { id: "soulfood", label: "Peaches HotHouse", w: 4, color: "#b5651d", actions: ["soulfood"], tags: ["food"], inside: "food" },
    { id: "garden", label: "Hattie Carthan Garden", w: 4, color: "#3f7d3a", actions: ["garden"], tags: ["outdoor"] },
    { id: "brownstone-2", label: "Brownstone", w: 4, color: "#6b3e2e", actions: ["go_home"], tags: ["residential"] },
    { id: "concord", label: "Concord Baptist Church", w: 4, color: "#a0522d", actions: ["church_service"], tags: ["business"], inside: "church" },
    { id: "sugarhill", label: "Sugar Hill Supper Club (6 PM–2 AM)", w: 4, color: "#4a1942", actions: ["enter_venue"], enter: "venue:sugarhill", tags: ["food", "business"] },
  ],
  extras: [
    { id: "stoop-1", kind: "stoop", x: 1, y: 3, w: 1, h: 1 },
    { id: "stoop-2", kind: "stoop", x: 13, y: 3, w: 1, h: 1 },
    tree("tree-1", 5, 5),
    tree("tree-2", 10, 5),
    bench("bench", 7, 6),
    lamp("lamp-1", 3, 6),
    { id: "cart", kind: "cart", x: 9, y: 7, w: 1, h: 1, label: "Incense cart", actions: ["snacks"], tags: ["business", "vendor"] },
  ],
  npcs: [
    { id: "pearl", name: "Miss Pearl", role: "Has lived on this block since 1971", look: look("#5e361f", "puff", "#f15bb5", "#5b4636", "#8f8f8f"),
      x: 2, y: 4, facing: 0, lines: ["Baby, this block raised me and I raised it back.", "Mind the garden on Saturday, we need hands.", "Back in my day the A train ran. Sometimes."] },
    { id: "dre", name: "Dre", role: "Plays ball on the block", look: look("#3e2416", "fade", "#e4572e"),
      x: 11, y: 7, facing: -Math.PI / 2, lines: ["Run it back?", "You new around here? Welcome to Bed-Stuy, do or die.", "Peaches got the best fried chicken in Brooklyn. Fight me."] },
  ],
});

export const FLATBUSH = street({
  id: "flatbush",
  name: "Flatbush Ave",
  neighborhood: "Flatbush",
  station: { name: "Church Av", lines: ["2", "5", "B", "Q"] },
  buildings: [
    { id: "jollof", label: "Jollof spot", w: 4, color: "#e63946", actions: ["jollof"], tags: ["food"], inside: "food" },
    { id: "soundsystem", label: "Sound system bar (5 PM–4 AM)", w: 5, color: "#1d3557", actions: ["enter_venue"], enter: "venue:soundsystem", tags: ["business"] },
    { id: "salon", label: "Braiding salon", w: 4, color: "#9b5de5", actions: ["braids"], tags: ["business"], inside: "salon" },
    { id: "dollar", label: "99¢ store", w: 3, color: "#f3c623", actions: ["snacks"], tags: ["food", "business"], inside: "market" },
    { id: "dutch-church", label: "Flatbush Reformed Dutch Church", w: 4, color: "#b9a68c", actions: ["church_service"], tags: ["business"], inside: "church" },
    { id: "kings", label: "Kings Theatre (7 PM–11 PM)", w: 4, color: "#8c1c13", actions: ["see_show"], tags: ["business"], inside: "theater", open: { open: 19, close: 23 } },
  ],
  extras: [
    tree("tree-1", 5, 5),
    bench("bench", 9, 5),
    lamp("lamp-1", 2, 6),
    lamp("lamp-2", 14, 6),
    { id: "cart", kind: "cart", x: 12, y: 7, w: 1, h: 1, label: "Fruit cart", actions: ["fruit"], tags: ["food", "vendor"] },
  ],
  npcs: [
    { id: "marcus", name: "Marcus", role: "Jollof spot owner", origin: "lagos", look: look("#4d2c1a", "fade", "#2a9d8f"),
      x: 2, y: 4, facing: 0, lines: ["Party jollof every day. Ghana people, I'm waiting.", "What's good? You hungry?", "Brooklyn is home now."] },
    { id: "rose", name: "Mama Rose", role: "Braider, 30 years", look: look("#3e2416", "braids", "#669bbc", "#26324a", "#3b2416"),
      x: 10, y: 4, facing: 0, lines: ["Knotless? Sit, it's six hours, bring snacks.", "Don't touch, let it set.", "My clients come from Philly for these."] },
  ],
});

export const WILLIAMSBURG = street({
  id: "williamsburg",
  name: "Bedford Ave",
  neighborhood: "Williamsburg",
  station: { name: "Lorimer St", lines: ["L", "G"] },
  buildings: [
    { id: "cafe", label: "Devoción (7 AM–7 PM)", w: 4, color: "#e9e4da", actions: ["enter_venue"], enter: "venue:cafe", tags: ["food", "business"] },
    { id: "records", label: "Record store", w: 4, color: "#264653", actions: ["records"], tags: ["business"], inside: "records" },
    { id: "rooftop", label: "Westlight (5 PM–2 AM)", w: 4, color: "#457b9d", actions: ["enter_venue"], enter: "venue:rooftop", tags: ["business"] },
    { id: "gym", label: "Boutique gym", w: 4, color: "#111111", actions: ["spin_class"], tags: ["business"], inside: "gym" },
    { id: "bowl", label: "Brooklyn Bowl (6 PM–2 AM)", w: 4, color: "#1f3b4d", actions: ["enter_venue"], enter: "venue:bowl", tags: ["business"] },
    { id: "library", label: "Williamsburgh Library", w: 4, color: "#a0806a", actions: ["read_book", "coding_class"], tags: ["business"], inside: "library" },
  ],
  extras: [
    tree("tree-1", 4, 5),
    tree("tree-2", 12, 6),
    bench("bench", 7, 5),
    lamp("lamp-1", 1, 6),
    { id: "cart", kind: "cart", x: 10, y: 7, w: 1, h: 1, label: "Smoothie cart", actions: ["smoothie"], tags: ["food", "vendor"] },
  ],
  npcs: [
    { id: "brooke", name: "Brooke", role: "Startup founder", look: look("#f6d7c3", "long", "#f3f3f3", "#c9b79c", "#d8b26e"),
      x: 2, y: 4, facing: 0, lines: ["We're like Uber, but for borrowing a cup of sugar.", "Pre-seed, pre-revenue, pre-product. Very exciting.", "Have you tried the oat cortado? Life-changing."] },
    { id: "raj", name: "Raj", role: "Self-taught engineer", origin: "dhaka", look: look("#9a5d3d", "waves", "#29335c"),
      x: 13, y: 4, facing: 0, lines: ["I learned to code from YouTube in Dhaka. Now I fix their code.", "Williamsburgh Library has free coding classes. Go.", "My mother asks when I'm getting married. Daily."] },
  ],
});

export const DUMBO = street({
  id: "dumbo",
  name: "Washington St",
  neighborhood: "DUMBO",
  station: { name: "York St", lines: ["F", "A", "C"] },
  buildings: [
    { id: "gallery", label: "Smack Mellon", w: 4, color: "#f4f1ea", actions: ["look_art"], tags: ["business"], inside: "gallery" },
    { id: "pizza", label: "Grimaldi's", w: 4, color: "#c0392b", actions: ["pizza"], tags: ["food"], inside: "food" },
    { id: "library", label: "Brooklyn Heights Library", w: 4, color: "#8d877d", actions: ["coding_class", "read_book"], tags: ["business"], inside: "library" },
    { id: "tower", label: "The Clock Tower", w: 4, color: "#5c6b7a", actions: ["penthouse"], tags: ["residential"] },
    { id: "st-anns", label: "St. Ann's Warehouse (7 PM–11 PM)", w: 4, color: "#6e3b2a", actions: ["see_show"], tags: ["business"], inside: "theater", open: { open: 19, close: 23 } },
  ],
  extras: [
    { id: "photo", kind: "photospot", x: 6, y: 6, w: 1, h: 1, label: "Manhattan Bridge view", actions: ["photo"], tags: ["outdoor"] },
    tree("tree-1", 2, 5),
    bench("bench", 10, 5),
    lamp("lamp-1", 14, 6),
    { id: "cart", kind: "cart", x: 4, y: 7, w: 1, h: 1, label: "Hot dog cart", actions: ["snacks"], tags: ["food", "vendor"] },
  ],
  npcs: [
    { id: "kayla", name: "Kayla", role: "Influencer", look: look("#c68863", "long", "#f15bb5", "#1b1b1b", "#3b2416"),
      x: 7, y: 7, facing: Math.PI, lines: ["Can you take one more? Like 40 more?", "The bridge is my office.", "Link in bio, babe."] },
  ],
});

export const PROSPECT_PARK: RoomDef = {
  id: "prospect-park",
  name: "Prospect Park",
  neighborhood: "Prospect Park",
  width: 16,
  height: 16,
  spawn: { x: 13, y: 13 },
  capacity: 30,
  kind: "park",
  station: { name: "Prospect Park", lines: ["B", "Q"] },
  arrivals: { subway: { x: 13, y: 13 } },
  props: [
    { id: "lawn", kind: "lawn", x: 1, y: 1, w: 6, h: 5, label: "Long Meadow", actions: ["picnic", "nap_lawn"], walkable: true, tags: ["outdoor"] },
    { id: "drums", kind: "drumcircle", x: 9, y: 2, w: 3, h: 3, label: "Drummer's Grove", actions: ["drum_circle"], walkable: true, tags: ["outdoor"] },
    { id: "grill", kind: "grill", x: 2, y: 9, w: 2, h: 1, label: "BBQ area", actions: ["grill"], tags: ["food", "outdoor"] },
    { id: "track", kind: "track", x: 0, y: 7, w: 16, h: 1, label: "Running loop", actions: ["run"], walkable: true, tags: ["outdoor"] },
    { id: "market", kind: "stall", x: 7, y: 9, w: 4, h: 2, label: "Grand Army Plaza Greenmarket (Sat 8 AM–2 PM)", actions: ["produce"], tags: ["food"],
      open: { open: 8, close: 14, days: [6] } },
    { id: "subway", kind: "subway", ...SUBWAY, label: "B Q · Prospect Park", actions: ["ride_subway", "go_to_work"] },
    tree("tree-1", 8, 1),
    tree("tree-2", 13, 1),
    tree("tree-3", 14, 4),
    tree("tree-4", 1, 12),
    tree("tree-5", 5, 13),
    tree("tree-6", 11, 12),
    bench("bench", 4, 11),
  ],
  npcs: [
    { id: "andre", name: "Andre", role: "Leads the drum circle", origin: "accra", look: look("#311c11", "locs", "#e0a526"),
      x: 12, y: 3, facing: -Math.PI / 2, lines: ["Feel it, don't count it.", "Every Sunday since 2009.", "Pick up a shaker, nobody's judging."] },
    { id: "sam", name: "Sam", role: "Training for the marathon", look: look("#eac0a2", "fade", "#f3a712", "#1b1b1b", "#a8732f"),
      x: 0, y: 7, facing: Math.PI / 2, lines: ["Mile nine!"],
      patrol: [{ x: 0, y: 7 }, { x: 15, y: 7 }, { x: 15, y: 6 }, { x: 0, y: 6 }] },
  ],
};

// ── Venue interiors ─────────────────────────────────────────────────────────
function bar(spec: {
  id: string;
  name: string;
  neighborhood: string;
  exitTo: RoomDef["exitTo"];
  open: OpenHours;
  theme: RoomDef["theme"];
  npcs: Npc[];
  /** Replaces the dance floor (bowling lanes, say). */
  floor?: Prop[];
}): RoomDef {
  return {
    id: spec.id,
    name: spec.name,
    neighborhood: spec.neighborhood,
    width: 10,
    height: 8,
    spawn: { x: 1, y: 6 },
    capacity: 30,
    kind: "venue",
    open: spec.open,
    exitTo: spec.exitTo,
    theme: spec.theme,
    npcs: spec.npcs,
    props: [
      { id: "door", kind: "door", x: 0, y: 6, w: 1, h: 1, label: "Door", actions: ["go_out"] },
      { id: "counter", kind: "counter", x: 2, y: 0, w: 5, h: 1, label: "Bar", actions: ["order_drink", "order_water"] },
      { id: "stool-1", kind: "stool", x: 2, y: 2, w: 1, h: 1, actions: ["lounge"] },
      { id: "stool-2", kind: "stool", x: 4, y: 2, w: 1, h: 1, actions: ["lounge"] },
      { id: "stool-3", kind: "stool", x: 6, y: 2, w: 1, h: 1, actions: ["lounge"] },
      ...(spec.floor ?? [{ id: "dancefloor", kind: "dancefloor", x: 5, y: 4, w: 4, h: 3, label: "Dance floor", actions: ["dance"], walkable: true } satisfies Prop]),
      { id: "dj", kind: "djbooth", x: 8, y: 0, w: 2, h: 1, label: "DJ booth", actions: ["dj_set"] },
    ],
  };
}

export const VENUES: RoomDef[] = [
  bar({
    id: "venue:warehouse",
    name: "House of Yes",
    neighborhood: "Bushwick",
    exitTo: { roomId: BUSHWICK.id, at: { x: 6, y: 3 } },
    open: { open: 21, close: 4 },
    theme: { floor: "#2b2b2f", floorAlt: "#26262a", wall: "#3a3a40", light: "#b84dff" },
    npcs: [
      { id: "dj-nova", name: "DJ Nova", role: "Resident DJ", look: look("#b0714d", "afro", "#111111"), x: 8, y: 1, facing: 0,
        lines: ["This next one's for the people who came here alone.", "Hands up if your rent went up this year."] },
      { id: "marco", name: "Marco", role: "Regular", look: look("#d9a47f", "bun", "#e4572e"), x: 7, y: 5, facing: Math.PI,
        lines: ["I told my boss I'm sick tomorrow. Preemptively.", "Came for the circus act, stayed till 4."] },
    ],
  }),
  bar({
    id: "venue:soundsystem",
    name: "Sound system bar",
    neighborhood: "Flatbush",
    exitTo: { roomId: FLATBUSH.id, at: { x: 6, y: 3 } },
    open: { open: 17, close: 4 },
    theme: { floor: "#3b2a1e", floorAlt: "#36261b", wall: "#1d3557", light: "#ffcc33" },
    npcs: [
      { id: "selector", name: "Selector Ras", role: "Runs the sound", origin: "kingston", look: look("#311c11", "locs", "#2a9d8f"), x: 8, y: 1, facing: 0,
        lines: ["Wheel it, wheel it!", "Bass so heavy the landlord feel it in Queens."] },
      { id: "nina", name: "Nina", role: "Nurse, off shift", origin: "lagos", look: look("#4d2c1a", "braids", "#f15bb5"), x: 3, y: 3, facing: Math.PI,
        lines: ["Twelve-hour shift. I deserve this.", "Afrobeats next or I'm leaving."] },
    ],
  }),
  bar({
    id: "venue:rooftop",
    name: "Westlight",
    neighborhood: "Williamsburg",
    exitTo: { roomId: WILLIAMSBURG.id, at: { x: 10, y: 3 } },
    open: { open: 17, close: 2 },
    theme: { floor: "#8d877d", floorAlt: "#857f75", wall: "#5c6b7a", light: "#ffd9a0" },
    npcs: [
      { id: "bartender", name: "Jules", role: "Bartender", look: look("#eac0a2", "fade", "#111111"), x: 4, y: 1, facing: 0,
        lines: ["$19 for the spritz. The view is free.", "Last call is a state of mind."] },
    ],
  }),
  bar({
    id: "venue:sugarhill",
    name: "Sugar Hill Supper Club",
    neighborhood: "Bed-Stuy",
    exitTo: { roomId: BED_STUY.id, at: { x: 22, y: 3 } },
    open: { open: 18, close: 2 },
    theme: { floor: "#5a2a3a", floorAlt: "#522636", wall: "#2e1a2a", light: "#ffb36b" },
    npcs: [
      { id: "earl", name: "Mr. Earl", role: "Regular since the eighties", look: look("#3e2416", "fade", "#7a1f2b", "#1b1b1b", "#8f8f8f"),
        x: 3, y: 3, facing: Math.PI, lines: ["Jazz on a Tuesday. That's how you know a place loves you.", "Dance with your partner, then dance with everybody."] },
    ],
  }),
  bar({
    id: "venue:bowl",
    name: "Brooklyn Bowl",
    neighborhood: "Williamsburg",
    exitTo: { roomId: WILLIAMSBURG.id, at: { x: 18, y: 3 } },
    open: { open: 18, close: 2 },
    theme: { floor: "#3a2a1e", floorAlt: "#35261b", wall: "#1f3b4d", light: "#ffcf7a" },
    floor: [5, 6, 7, 8].map((x, i) => ({
      id: `lane-${i + 1}`, kind: "lane" as const, x, y: 3, w: 1, h: 4, label: "Bowling lanes", actions: ["bowl"], signless: i > 0,
    })),
    npcs: [
      { id: "tasha", name: "Tasha", role: "League bowler", look: look("#5e361f", "puff", "#2a9d8f"), x: 3, y: 4, facing: Math.PI / 2,
        lines: ["Band's on at ten. Strike before then.", "The fried chicken here is a whole reason to come."] },
    ],
  }),
  {
    id: "venue:cafe",
    name: "Devoción",
    neighborhood: "Williamsburg",
    width: 8,
    height: 8,
    spawn: { x: 1, y: 6 },
    capacity: 20,
    kind: "venue",
    open: { open: 7, close: 19 },
    exitTo: { roomId: WILLIAMSBURG.id, at: { x: 2, y: 3 } },
    theme: { floor: "#cbb89d", floorAlt: "#c3b095", wall: "#e9e4da", light: "#fff2d6" },
    props: [
      { id: "door", kind: "door", x: 0, y: 6, w: 1, h: 1, label: "Door", actions: ["go_out"] },
      { id: "counter", kind: "counter", x: 2, y: 0, w: 4, h: 1, label: "Counter", actions: ["latte", "pastry"] },
      { id: "table-1", kind: "table", x: 2, y: 3, w: 1, h: 1, actions: ["laptop_work"] },
      { id: "table-2", kind: "table", x: 5, y: 3, w: 1, h: 1, actions: ["laptop_work"] },
      { id: "table-3", kind: "table", x: 5, y: 6, w: 1, h: 1, actions: ["laptop_work"] },
      { id: "stool-1", kind: "stool", x: 3, y: 5, w: 1, h: 1, actions: ["lounge"] },
    ],
    npcs: [
      { id: "barista", name: "Indigo", role: "Barista", look: look("#f6d7c3", "long", "#3f5e3a", "#26324a", "#7b3fa0"), x: 4, y: 1, facing: 0,
        lines: ["Oat, almond, or the new pistachio?", "WiFi password is on the chalkboard. It's 'pay first'."] },
    ],
  },
];

// ── Home ────────────────────────────────────────────────────────────────────
/** Fallback shape for a home before its saved layout has loaded (homes.ts has the real ones). */
export const BASEMENT_ROOM: RoomDef = {
  id: "home-basement",
  name: "Basement room",
  neighborhood: "Crown Heights",
  width: 8,
  height: 8,
  spawn: { x: 1, y: 6 },
  capacity: 8,
  kind: "home",
  exitTo: { roomId: CROWN_HEIGHTS.id, at: CROWN_HEIGHTS.arrivals!.home! },
  theme: { floor: "#a47d55", floorAlt: "#9c7650", wall: "#d9cfc0", light: "#ffd9a0" },
  props: [{ id: "door", kind: "door", x: 0, y: 6, w: 1, h: 1, label: "Door", actions: ["go_out"] }],
};

// ── Registry ────────────────────────────────────────────────────────────────
export const STREETS: RoomDef[] = [CROWN_HEIGHTS, BUSHWICK, BED_STUY, FLATBUSH, WILLIAMSBURG, DUMBO, PROSPECT_PARK];

export const ROOMS: Record<string, RoomDef> = Object.fromEntries([...STREETS, ...VENUES, ...SHOPS].map((r) => [r.id, r]));

/** New arrivals start on the block where their room is. */
export const STREET_ID = CROWN_HEIGHTS.id;

export const homeRoomId = (characterId: string) => `home:${characterId}`;
export const isHomeRoom = (roomId: string) => roomId.startsWith("home:");

/** Room layout for any room id, including private homes. */
export function roomDef(roomId: string): RoomDef | null {
  if (isHomeRoom(roomId)) return { ...BASEMENT_ROOM, id: roomId };
  return ROOMS[roomId] ?? null;
}

/**
 * Strip instance suffix from a room id. `venue:warehouse:2` → `venue:warehouse`.
 * Streets and homes are never instanced, so they pass through unchanged.
 */
export function baseRoomId(roomId: string): string {
  if (isHomeRoom(roomId) || !roomId.includes(":")) return roomId;
  // Instance suffix is `:N` where N is 1–9 at the very end
  const m = roomId.match(/^(.+):(\d)$/);
  if (m && ROOMS[m[1]!]) return m[1]!;
  return roomId;
}

/** Map positions for the phone's Brooklyn map (rough geography, not to scale). */
export const NEIGHBORHOOD_MAP: Record<string, { x: number; y: number }> = {
  dumbo: { x: 0.6, y: 2.4 },
  williamsburg: { x: 2.6, y: 0.8 },
  "bushwick-block": { x: 5.2, y: 1.6 },
  "bed-stuy": { x: 3.6, y: 3.2 },
  "crown-heights": { x: 4, y: 5 },
  "prospect-park": { x: 2.2, y: 5.6 },
  flatbush: { x: 3.4, y: 7.2 },
};
