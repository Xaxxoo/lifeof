/**
 * How each neighborhood looks. New York is not one place: a Bed-Stuy brownstone block, a Bushwick
 * warehouse strip and a Financial District canyon should be told apart at a glance, before you read
 * a single sign. The renderer reads this; nothing here changes what you can do.
 */

/** What the buildings on a block are like. A building can override its block's style. */
export type Architecture =
  /** Brown or rose stone, stoops, a heavy cornice: Bed-Stuy, Crown Heights side streets. */
  | "brownstone"
  /** Four to six floors of brick with black fire escapes zigzagging down the front: LES, Chinatown, Flatbush. */
  | "tenement"
  /** Low brick, roll-down gates, murals: Bushwick. */
  | "warehouse"
  /** Converted factory: tall arched windows, cast-iron columns: DUMBO, Williamsburg. */
  | "loft"
  /** Glass towers: Williamsburg waterfront condos, the Financial District. */
  | "glass"
  /** Pale stone and columns: Wall St, old banks, Federal Hall. */
  | "stone"
  /** Two-floor painted storefronts with deep awnings: Nostrand Ave, Flatbush Ave. */
  | "rowhouse";

/** Street dressing hung over or along the block. */
export type Decor =
  /** Triangle flags in Caribbean colors strung across the street. */
  | "bunting"
  /** Red paper lanterns strung across the street. */
  | "lanterns"
  /** Warm bulbs strung across the street. */
  | "stringlights"
  /** Neon signs that light up at night. */
  | "neon"
  /** Painted murals on the walls. */
  | "murals"
  /** Graffiti on the roll-down gates. */
  | "graffiti"
  /** Sidewalk scaffolding (there's always scaffolding). */
  | "scaffolding"
  /** Flower planters along the curb. */
  | "planters"
  /** American flags on poles over the doors. */
  | "flags";

/** Something huge in the distance you'd recognize. */
export type Landmark = "manhattan-bridge" | "williamsburg-bridge" | "one-wtc" | "empire-state" | "manhattan-skyline" | "brooklyn-skyline";

export interface DistrictStyle {
  borough: "Brooklyn" | "Manhattan";
  architecture: Architecture;
  /** Ground and wall colors for this block and the city around it. */
  palette: {
    ground: string;
    sidewalk: string;
    slab: string;
    road: string;
    curb: string;
    /** Shop brand colors are pulled toward this so the block reads as one place. */
    wall: string;
    /** Colors for the buildings around the block. */
    walls: string[];
    leaf: string[];
  };
  road: "asphalt" | "cobble";
  decor: Decor[];
  /** The city around the block: how tall it gets, and what share of it is glass towers. */
  skyline: { min: number; max: number; towers: number; trees: number };
  /** Water on the far side of the block (the East River), with the other borough across it. */
  waterfront?: boolean;
  landmarks: Landmark[];
  /** How the street feels at night, for the light around the block. */
  nightGlow: string;
}

const BROWN_LEAF = ["#2f5f3c", "#3a6e44", "#2a5236"];

export const DISTRICTS: Record<string, DistrictStyle> = {
  "crown-heights": {
    borough: "Brooklyn",
    architecture: "rowhouse",
    palette: {
      ground: "#8a6f7c",
      sidewalk: "#9a8090",
      slab: "#88707f",
      road: "#2e2638",
      curb: "#c8b0be",
      wall: "#9a6a62",
      walls: ["#a3685a", "#c08a4a", "#5f8a7a", "#9a5a6a", "#b0784e", "#7a6a8a"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: ["bunting", "planters"],
    skyline: { min: 1.6, max: 4.2, towers: 0, trees: 0.2 },
    landmarks: [],
    nightGlow: "#ffb36b",
  },
  "bushwick-block": {
    borough: "Brooklyn",
    architecture: "warehouse",
    palette: {
      ground: "#6e6470",
      sidewalk: "#857a86",
      slab: "#706672",
      road: "#26222c",
      curb: "#a89aa8",
      wall: "#7a4a44",
      walls: ["#7a4038", "#8a5a4a", "#5a5458", "#6e3a34", "#4a4650", "#8a6a5a"],
      leaf: ["#3a5a3c", "#2f4f34"],
    },
    road: "asphalt",
    decor: ["murals", "graffiti", "stringlights"],
    skyline: { min: 1.2, max: 3.2, towers: 0, trees: 0.06 },
    landmarks: ["manhattan-skyline"],
    nightGlow: "#c77dff",
  },
  "bed-stuy": {
    borough: "Brooklyn",
    architecture: "brownstone",
    palette: {
      ground: "#7d6a6a",
      sidewalk: "#948080",
      slab: "#806c6c",
      road: "#2c2630",
      curb: "#bba6a0",
      wall: "#6b4434",
      walls: ["#6b4434", "#7a5040", "#5e3a2e", "#8a5a48", "#73483a", "#a07a64"],
      leaf: ["#2f6a3c", "#3a7a44", "#2a5a36", "#467a3a"],
    },
    road: "asphalt",
    decor: ["planters"],
    skyline: { min: 2.2, max: 3.4, towers: 0, trees: 0.3 },
    landmarks: [],
    nightGlow: "#ffd9a0",
  },
  flatbush: {
    borough: "Brooklyn",
    architecture: "tenement",
    palette: {
      ground: "#7e6a86",
      sidewalk: "#90809a",
      slab: "#7c6c88",
      road: "#2a2434",
      curb: "#b8a6c4",
      wall: "#8a5a5a",
      walls: ["#9a5a4a", "#7a6a5a", "#8a4a4a", "#a07850", "#6a5a6a", "#9a6a7a"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: ["neon", "flags", "scaffolding"],
    skyline: { min: 2, max: 5.5, towers: 0.04, trees: 0.08 },
    landmarks: [],
    nightGlow: "#ffcc33",
  },
  williamsburg: {
    borough: "Brooklyn",
    architecture: "loft",
    palette: {
      ground: "#727a8a",
      sidewalk: "#8a92a2",
      slab: "#788090",
      road: "#262a34",
      curb: "#b0b8c8",
      wall: "#6a5a5a",
      walls: ["#7a4a3a", "#5a6a7a", "#8a8a8a", "#4a5a6a", "#9aa8b8", "#6a4a40"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: ["stringlights", "murals"],
    skyline: { min: 2, max: 9, towers: 0.25, trees: 0.08 },
    waterfront: true,
    landmarks: ["williamsburg-bridge", "manhattan-skyline", "empire-state"],
    nightGlow: "#ffe2a8",
  },
  dumbo: {
    borough: "Brooklyn",
    architecture: "loft",
    palette: {
      ground: "#6e6a74",
      sidewalk: "#8a8490",
      slab: "#76707c",
      road: "#5a5058",
      curb: "#b0a8b4",
      wall: "#7a4438",
      walls: ["#7a4438", "#8a5040", "#6a3a30", "#94603e", "#5a4a4a", "#7a6a60"],
      leaf: BROWN_LEAF,
    },
    road: "cobble",
    decor: ["stringlights"],
    skyline: { min: 2.6, max: 6, towers: 0.05, trees: 0.04 },
    waterfront: true,
    landmarks: ["manhattan-bridge", "manhattan-skyline", "one-wtc", "empire-state"],
    nightGlow: "#ffd9a0",
  },
  "prospect-park": {
    borough: "Brooklyn",
    architecture: "brownstone",
    palette: {
      ground: "#5e7a58",
      sidewalk: "#8d77a0",
      slab: "#7d6890",
      road: "#2e2638",
      curb: "#b8a2c8",
      wall: "#7a6290",
      walls: ["#7a5a4a", "#8a6a5a", "#6a4a3a", "#937a66"],
      leaf: ["#2f5f3c", "#3a6e44", "#2a5236", "#4a7a40"],
    },
    road: "asphalt",
    decor: [],
    skyline: { min: 2, max: 4, towers: 0, trees: 0.5 },
    landmarks: [],
    nightGlow: "#fff1e0",
  },
  chinatown: {
    borough: "Manhattan",
    architecture: "tenement",
    palette: {
      ground: "#7a6670",
      sidewalk: "#8e7a84",
      slab: "#7a6670",
      road: "#2a2228",
      curb: "#b8a4ae",
      wall: "#8a4a3e",
      walls: ["#8a4a3e", "#9a6a4a", "#6a5a5a", "#a05a4a", "#7a5a6a", "#b08a5a"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: ["lanterns", "neon", "scaffolding"],
    skyline: { min: 3, max: 7, towers: 0.12, trees: 0.03 },
    landmarks: ["manhattan-bridge", "one-wtc"],
    nightGlow: "#ff5a4a",
  },
  "lower-east-side": {
    borough: "Manhattan",
    architecture: "tenement",
    palette: {
      ground: "#6a5e72",
      sidewalk: "#7e7288",
      slab: "#6c6076",
      road: "#221e2a",
      curb: "#a89cb4",
      wall: "#6a3e3e",
      walls: ["#6a3e3e", "#7a4a3a", "#5a4a5a", "#8a5a4a", "#4a4a5a", "#7a3a4a"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: ["neon", "graffiti", "stringlights"],
    skyline: { min: 3, max: 7, towers: 0.15, trees: 0.03 },
    landmarks: ["williamsburg-bridge", "empire-state"],
    nightGlow: "#ff3fa4",
  },
  "financial-district": {
    borough: "Manhattan",
    architecture: "stone",
    palette: {
      ground: "#7a7a86",
      sidewalk: "#9a98a4",
      slab: "#84828e",
      road: "#2a2a32",
      curb: "#c4c2cc",
      wall: "#a09a92",
      walls: ["#9aa6b8", "#7a8aa0", "#b0aaa0", "#5a6a80", "#8a96a8", "#c0b8a8"],
      leaf: BROWN_LEAF,
    },
    road: "cobble",
    decor: ["flags"],
    skyline: { min: 8, max: 26, towers: 0.75, trees: 0 },
    landmarks: ["one-wtc", "brooklyn-skyline"],
    nightGlow: "#e6f4ff",
  },
  "manhattan-bridge": {
    borough: "Brooklyn",
    architecture: "loft",
    palette: {
      ground: "#1f4f62",
      sidewalk: "#7a8494",
      slab: "#6a7484",
      road: "#3a3a44",
      curb: "#a0aab8",
      wall: "#6a7a8a",
      walls: ["#7a4438", "#8a5040", "#5a6a7a", "#9aa8b8"],
      leaf: BROWN_LEAF,
    },
    road: "asphalt",
    decor: [],
    skyline: { min: 3, max: 22, towers: 0.5, trees: 0 },
    waterfront: true,
    landmarks: ["manhattan-skyline", "one-wtc", "empire-state", "brooklyn-skyline"],
    nightGlow: "#ffe2a8",
  },
};

/** A room's look: its own block's, or the block outside for a shop or venue. */
export function districtOf(roomId: string | undefined): DistrictStyle {
  return (roomId && DISTRICTS[roomId]) || DISTRICTS["crown-heights"]!;
}
