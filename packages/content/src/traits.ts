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
