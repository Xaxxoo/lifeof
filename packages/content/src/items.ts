/**
 * Furniture catalog (PRD §6.5 home, §9.3 build mode). Footprints are in tiles before rotation.
 * Starter items are given free to a new home and sell back for nothing.
 * Stars are quality: a better bed or sofa restores more (see qualityMultiplier).
 */
export type ItemModel =
  | "bed" | "mattress" | "nightstand" | "dresser" | "wardrobe"
  | "fridge" | "bigfridge" | "stove" | "counter" | "sink" | "diningtable"
  | "toilet" | "shower" | "bathtub" | "vanity"
  | "sofa" | "sectional" | "armchair" | "beanbag" | "coffeetable" | "table" | "chair"
  | "tv" | "console" | "arcade" | "speaker" | "turntable" | "aquarium"
  | "desk" | "mirror" | "guitar" | "dumbbells" | "treadmill" | "yogamat" | "easel" | "piano" | "bookshelf"
  | "lamp" | "tablelamp" | "neon" | "stringlights"
  | "plant" | "monstera" | "cactus" | "rug" | "art" | "vase";

export type ItemCategory = "Sleep" | "Kitchen" | "Bath" | "Comfort" | "Fun" | "Skills" | "Light" | "Decor";

export const ITEM_CATEGORIES: { id: ItemCategory; icon: string }[] = [
  { id: "Sleep", icon: "🛏️" },
  { id: "Kitchen", icon: "🍳" },
  { id: "Bath", icon: "🛁" },
  { id: "Comfort", icon: "🛋️" },
  { id: "Fun", icon: "📺" },
  { id: "Skills", icon: "🎸" },
  { id: "Light", icon: "💡" },
  { id: "Decor", icon: "🪴" },
];

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  w: number;
  h: number;
  model: ItemModel;
  color: string;
  actions: string[];
  category: ItemCategory;
  /** Quality, 1–4. */
  stars: number;
  /** Flat items (rugs) don't block walking and can sit under other things. */
  walkable?: boolean;
}

const i = (
  id: string,
  name: string,
  price: number,
  category: ItemCategory,
  model: ItemModel,
  size: [number, number],
  color: string,
  actions: string[] = [],
  stars = 1,
  extra: Partial<ItemDef> = {},
): ItemDef => ({ id, name, price, category, model, w: size[0], h: size[1], color, actions, stars, ...extra });

const REST = ["sleep", "nap"];
const SIT = ["lounge", "watch_tv"];

export const ITEMS: ItemDef[] = [
  // Sleep
  i("air-mattress", "Air mattress", 0, "Sleep", "mattress", [1, 2], "#5b7fa6", REST),
  i("futon", "Futon", 160, "Sleep", "mattress", [1, 2], "#8a5a44", REST, 1),
  i("twin-bed", "Twin bed", 320, "Sleep", "bed", [1, 2], "#c9b79c", REST, 2),
  i("queen-bed", "Queen bed", 900, "Sleep", "bed", [2, 2], "#e9e4da", REST, 3),
  i("canopy-bed", "Canopy king", 2400, "Sleep", "bed", [2, 2], "#7a2e3a", REST, 4),
  i("nightstand", "Nightstand", 80, "Sleep", "nightstand", [1, 1], "#8a6a48"),
  i("dresser", "Dresser", 220, "Sleep", "dresser", [2, 1], "#a07a52", [], 2),
  i("wardrobe", "Wardrobe", 380, "Sleep", "wardrobe", [2, 1], "#6b4f3a", [], 2),

  // Kitchen
  i("mini-fridge", "Mini fridge", 0, "Kitchen", "fridge", [1, 1], "#d9dde2", ["eat_leftovers"]),
  i("fridge", "Fridge-freezer", 700, "Kitchen", "bigfridge", [1, 1], "#e8ebee", ["eat_leftovers"], 3),
  i("hot-plate", "Hot plate", 0, "Kitchen", "stove", [1, 1], "#3a3a3a", ["cook"]),
  i("full-stove", "Gas stove", 650, "Kitchen", "stove", [1, 1], "#e6e6e6", ["cook"], 2),
  i("range", "Chef's range", 1600, "Kitchen", "stove", [1, 1], "#b9bec4", ["cook"], 4),
  i("counter", "Counter", 140, "Kitchen", "counter", [1, 1], "#d9cfbf"),
  i("sink", "Kitchen sink", 180, "Kitchen", "sink", [1, 1], "#d9cfbf"),
  i("dining-table", "Dining table", 260, "Kitchen", "diningtable", [2, 1], "#a07a52", [], 2),

  // Bath
  i("toilet", "Toilet", 0, "Bath", "toilet", [1, 1], "#f4f4f4", ["toilet"]),
  i("fancy-toilet", "Heated-seat toilet", 400, "Bath", "toilet", [1, 1], "#ffffff", ["toilet"], 3),
  i("shower-stall", "Shower stall", 0, "Bath", "shower", [1, 1], "#bfd9e6", ["shower"]),
  i("rain-shower", "Rain shower", 900, "Bath", "shower", [1, 1], "#d6ecf5", ["shower"], 3),
  i("bathtub", "Bathtub", 1100, "Bath", "bathtub", [1, 2], "#f4f4f4", ["take_bath", "shower"], 3),
  i("clawfoot", "Clawfoot tub", 2600, "Bath", "bathtub", [1, 2], "#f7f3ea", ["take_bath", "shower"], 4),
  i("vanity", "Vanity", 260, "Bath", "vanity", [1, 1], "#d9cfbf", ["practice_charisma"], 2),

  // Comfort
  i("sofa", "Thrift sofa", 260, "Comfort", "sofa", [2, 1], "#7a4e3a", SIT),
  i("velvet-sofa", "Velvet sofa", 1100, "Comfort", "sofa", [2, 1], "#2f5d4a", SIT, 3),
  i("sectional", "Sectional", 2200, "Comfort", "sectional", [3, 2], "#8d8a86", SIT, 4),
  i("armchair", "Armchair", 140, "Comfort", "armchair", [1, 1], "#4f6d5a", ["lounge"]),
  i("lounge-chair", "Leather lounge chair", 600, "Comfort", "armchair", [1, 1], "#5a3a28", ["lounge"], 3),
  i("beanbag", "Beanbag", 90, "Comfort", "beanbag", [1, 1], "#e76f51", ["lounge"]),
  i("coffee-table", "Coffee table", 120, "Comfort", "coffeetable", [2, 1], "#8a6a48"),
  i("table", "Folding table", 60, "Comfort", "table", [1, 1], "#b08a5c"),
  i("chair", "Chair", 35, "Comfort", "chair", [1, 1], "#8a6a48", ["lounge"]),

  // Fun
  i("old-tv", "Old TV", 120, "Fun", "tv", [1, 1], "#2b2b2b", ["watch_tv"]),
  i("flat-tv", "Flat-screen TV", 480, "Fun", "tv", [2, 1], "#111111", ["watch_tv"], 2),
  i("big-tv", "75-inch TV", 1800, "Fun", "tv", [3, 1], "#0b0b0d", ["watch_tv"], 4),
  i("game-console", "Game console", 450, "Fun", "console", [1, 1], "#1d1d22", ["play_games"], 2),
  i("arcade", "Arcade cabinet", 1500, "Fun", "arcade", [1, 1], "#3a0ca3", ["play_games"], 3),
  i("speaker", "Bluetooth speaker", 300, "Fun", "speaker", [1, 1], "#222226", ["listen_records"], 2),
  i("turntable", "Turntable", 380, "Fun", "turntable", [1, 1], "#7a5238", ["listen_records"], 3),
  i("aquarium", "Aquarium", 650, "Fun", "aquarium", [2, 1], "#3a86b5", [], 3),

  // Skills
  i("desk", "Desk + old laptop", 380, "Skills", "desk", [2, 1], "#9c7b55", ["study_coding"], 2),
  i("gaming-desk", "Battle station", 1400, "Skills", "desk", [2, 1], "#1b1b20", ["study_coding", "play_games"], 4),
  i("mirror", "Mirror", 45, "Skills", "mirror", [1, 1], "#cfe0ea", ["practice_charisma"]),
  i("guitar", "Acoustic guitar", 180, "Skills", "guitar", [1, 1], "#a0522d", ["play_guitar"]),
  i("dumbbells", "Dumbbells", 90, "Skills", "dumbbells", [1, 1], "#333333", ["work_out"]),
  i("treadmill", "Treadmill", 900, "Skills", "treadmill", [1, 2], "#2b2b30", ["work_out"], 3),
  i("yoga-mat", "Yoga mat", 60, "Skills", "yogamat", [1, 2], "#7c5cbf", ["yoga"]),
  i("easel", "Easel", 150, "Skills", "easel", [1, 1], "#b08a5c", ["paint_canvas"], 2),
  i("piano", "Upright piano", 2800, "Skills", "piano", [2, 1], "#1b1414", ["play_piano"], 4),
  i("bookshelf", "Bookshelf", 110, "Skills", "bookshelf", [1, 1], "#6b4f3a", ["read_home"]),

  // Light
  i("floor-lamp", "Floor lamp", 55, "Light", "lamp", [1, 1], "#f3d8a0"),
  i("arc-lamp", "Arc lamp", 320, "Light", "lamp", [1, 1], "#e9e4da", [], 3),
  i("table-lamp", "Table lamp", 40, "Light", "tablelamp", [1, 1], "#f0c27b"),
  i("neon-sign", "\"BK\" neon sign", 260, "Light", "neon", [1, 1], "#ff4fa3", [], 2),
  i("string-lights", "String lights", 120, "Light", "stringlights", [2, 1], "#ffd27a", [], 2),

  // Decor
  i("plant", "Snake plant", 25, "Decor", "plant", [1, 1], "#3f7d3a"),
  i("cactus", "Cactus", 30, "Decor", "cactus", [1, 1], "#4f8a4a"),
  i("monstera", "Monstera", 90, "Decor", "monstera", [1, 1], "#2f6b3a", [], 2),
  i("rug", "Kente-print rug", 70, "Decor", "rug", [2, 2], "#e0a526", [], 2, { walkable: true }),
  i("persian-rug", "Persian rug", 600, "Decor", "rug", [3, 2], "#8c2f39", [], 4, { walkable: true }),
  i("wall-art", "Framed print", 140, "Decor", "art", [1, 1], "#e76f51", [], 2),
  i("vase", "Vase + flowers", 45, "Decor", "vase", [1, 1], "#2a9d8f"),
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

/** Refund when selling (PRD build mode). */
export const SELL_BACK_RATE = 0.5;

/** Better furniture restores more: +20% of the positive need gain per star above one. */
export function qualityMultiplier(stars: number): number {
  return 1 + 0.2 * Math.max(0, stars - 1);
}
