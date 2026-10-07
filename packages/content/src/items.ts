/**
 * Furniture catalog (PRD §6.5 home, §9.3 build mode). Footprints are in tiles before rotation.
 * Starter items are given free to a new home and sell back for nothing.
 */
export type ItemModel =
  | "bed" | "mattress" | "fridge" | "stove" | "toilet" | "shower" | "tv" | "sofa" | "armchair" | "table" | "chair"
  | "plant" | "mirror" | "desk" | "guitar" | "dumbbells" | "rug" | "lamp" | "bookshelf" | "radiator";

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  w: number;
  h: number;
  model: ItemModel;
  color: string;
  actions: string[];
  category: "Sleep" | "Kitchen" | "Bathroom" | "Living" | "Hobby" | "Decor";
  /** Flat items (rugs) don't block walking and can sit under other things. */
  walkable?: boolean;
}

export const ITEMS: ItemDef[] = [
  { id: "air-mattress", name: "Air mattress", price: 0, w: 1, h: 2, model: "mattress", color: "#5b7fa6", actions: ["sleep", "nap"], category: "Sleep" },
  { id: "twin-bed", name: "Twin bed", price: 320, w: 1, h: 2, model: "bed", color: "#c9b79c", actions: ["sleep", "nap"], category: "Sleep" },
  { id: "queen-bed", name: "Queen bed", price: 900, w: 2, h: 2, model: "bed", color: "#e9e4da", actions: ["sleep", "nap"], category: "Sleep" },
  { id: "mini-fridge", name: "Mini fridge", price: 0, w: 1, h: 1, model: "fridge", color: "#d9dde2", actions: ["eat_leftovers"], category: "Kitchen" },
  { id: "hot-plate", name: "Hot plate", price: 0, w: 1, h: 1, model: "stove", color: "#3a3a3a", actions: ["cook"], category: "Kitchen" },
  { id: "full-stove", name: "Gas stove", price: 650, w: 1, h: 1, model: "stove", color: "#e6e6e6", actions: ["cook"], category: "Kitchen" },
  { id: "toilet", name: "Toilet", price: 0, w: 1, h: 1, model: "toilet", color: "#f4f4f4", actions: ["toilet"], category: "Bathroom" },
  { id: "shower-stall", name: "Shower stall", price: 0, w: 1, h: 1, model: "shower", color: "#bfd9e6", actions: ["shower"], category: "Bathroom" },
  { id: "old-tv", name: "Old TV", price: 120, w: 1, h: 1, model: "tv", color: "#2b2b2b", actions: ["watch_tv"], category: "Living" },
  { id: "flat-tv", name: "Flat-screen TV", price: 480, w: 2, h: 1, model: "tv", color: "#111111", actions: ["watch_tv"], category: "Living" },
  { id: "sofa", name: "Thrift sofa", price: 260, w: 2, h: 1, model: "sofa", color: "#7a4e3a", actions: ["lounge", "watch_tv"], category: "Living" },
  { id: "armchair", name: "Armchair", price: 140, w: 1, h: 1, model: "armchair", color: "#4f6d5a", actions: ["lounge"], category: "Living" },
  { id: "table", name: "Folding table", price: 60, w: 1, h: 1, model: "table", color: "#b08a5c", actions: [], category: "Living" },
  { id: "chair", name: "Chair", price: 35, w: 1, h: 1, model: "chair", color: "#8a6a48", actions: ["lounge"], category: "Living" },
  { id: "desk", name: "Desk + old laptop", price: 380, w: 2, h: 1, model: "desk", color: "#9c7b55", actions: ["study_coding"], category: "Hobby" },
  { id: "mirror", name: "Mirror", price: 45, w: 1, h: 1, model: "mirror", color: "#cfe0ea", actions: ["practice_charisma"], category: "Hobby" },
  { id: "guitar", name: "Acoustic guitar", price: 180, w: 1, h: 1, model: "guitar", color: "#a0522d", actions: ["play_guitar"], category: "Hobby" },
  { id: "dumbbells", name: "Dumbbells", price: 90, w: 1, h: 1, model: "dumbbells", color: "#333333", actions: ["work_out"], category: "Hobby" },
  { id: "plant", name: "Snake plant", price: 25, w: 1, h: 1, model: "plant", color: "#3f7d3a", actions: [], category: "Decor" },
  { id: "rug", name: "Kente-print rug", price: 70, w: 2, h: 2, model: "rug", color: "#e0a526", actions: [], category: "Decor", walkable: true },
  { id: "floor-lamp", name: "Floor lamp", price: 55, w: 1, h: 1, model: "lamp", color: "#f3d8a0", actions: [], category: "Decor" },
  { id: "bookshelf", name: "Bookshelf", price: 110, w: 1, h: 1, model: "bookshelf", color: "#6b4f3a", actions: [], category: "Decor" },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Refund when selling (PRD build mode). */
export const SELL_BACK_RATE = 0.5;
