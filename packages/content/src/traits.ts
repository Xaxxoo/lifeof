export const TRAITS = [
  { id: "early-bird", name: "Early Bird" },
  { id: "night-owl", name: "Night Owl" },
  { id: "hustler", name: "Hustler" },
  { id: "charmer", name: "Charmer" },
  { id: "neat-freak", name: "Neat Freak" },
  { id: "foodie", name: "Foodie" },
  { id: "homebody", name: "Homebody" },
  { id: "tough-skin", name: "Tough Skin" },
] as const;

export type TraitId = (typeof TRAITS)[number]["id"];
export const TRAIT_IDS = TRAITS.map((t) => t.id) as [TraitId, ...TraitId[]];

export const SKIN_TONES = [
  "#f6d7c3", "#eac0a2", "#d9a47f", "#c68863", "#b0714d", "#9a5d3d",
  "#86502f", "#714226", "#5e361f", "#4d2c1a", "#3e2416", "#311c11",
] as const;

export const SHIRT_COLORS = ["#e4572e", "#29335c", "#f3a712", "#669bbc", "#2a9d8f", "#9b5de5", "#f15bb5", "#222222"] as const;

export const PANTS_COLORS = ["#26324a", "#1b1b1b", "#5b4636", "#7c8a99", "#3f5e3a", "#c9b79c"] as const;

export const HAIR_COLORS = ["#1a1410", "#3b2416", "#6b4226", "#a8732f", "#d8b26e", "#8f8f8f", "#b5331f", "#7b3fa0"] as const;

/** Hair and headwear. Wide range done well, especially Black hair styles (PRD §9.4). */
export const HAIR_STYLES = [
  { id: "fade", name: "Fade" },
  { id: "waves", name: "Waves" },
  { id: "afro", name: "Afro" },
  { id: "puff", name: "Afro puff" },
  { id: "braids", name: "Braids" },
  { id: "locs", name: "Locs" },
  { id: "bun", name: "Bun" },
  { id: "long", name: "Long" },
  { id: "headwrap", name: "Headwrap" },
  { id: "hijab", name: "Hijab" },
  { id: "bald", name: "Bald" },
] as const;

export type HairStyleId = (typeof HAIR_STYLES)[number]["id"];
export const HAIR_STYLE_IDS = HAIR_STYLES.map((h) => h.id) as [HairStyleId, ...HairStyleId[]];

export interface Look {
  skin: string;
  shirt: string;
  pants: string;
  hair: HairStyleId;
  hairColor: string;
}

export const DEFAULT_LOOK: Look = {
  skin: SKIN_TONES[6],
  shirt: SHIRT_COLORS[0],
  pants: PANTS_COLORS[0],
  hair: "fade",
  hairColor: HAIR_COLORS[0],
};

/** Older characters only stored skin and shirt; fill in the rest. */
export function normalizeLook(look: { skin: string; shirt: string; pants?: string; hair?: string; hairColor?: string }): Look {
  const hair = (HAIR_STYLE_IDS as readonly string[]).includes(look.hair ?? "") ? (look.hair as HairStyleId) : DEFAULT_LOOK.hair;
  return { ...DEFAULT_LOOK, ...look, hair };
}
