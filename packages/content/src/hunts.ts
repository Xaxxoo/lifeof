import { PLACE_BY_ID } from "./places";

/**
 * Treasure hunts: brand campaigns that send players to real places on the map.
 * Each step is a clue pointing at a place; standing there and searching finds it. Find every step to win.
 * The first `supply` finishers get the prize: in-game cash, and optionally a Stellar payment.
 *
 * Campaigns live in the database so partners can launch them without a deploy. LAUNCH_HUNTS seeds the first one.
 */
export type HuntAsset = "XLM" | "USDT";

export interface HuntStep {
  placeId: string;
  /** The riddle players see. Never shown before the previous step is found. */
  clue: string;
}

export interface HuntSponsor {
  name: string;
  color: string;
  url?: string;
}

export interface HuntPrize {
  /** In-game dollars to every finisher who places within supply. */
  cash: number;
  /** Paid on Stellar to the finisher's wallet, from the game's treasury account. */
  stellar?: { asset: HuntAsset; amount: string };
}

export interface HuntDef {
  id: string;
  name: string;
  blurb: string;
  sponsor: HuntSponsor;
  /** ms since epoch. */
  startsAt: number;
  endsAt: number;
  steps: HuntStep[];
  prize: HuntPrize;
  /** How many finishers get the prize. */
  supply: number;
}

export const MAX_HUNT_STEPS = 12;
/** Stellar text memos are 28 bytes; `hunt:<id>#<rank>` has to fit. */
export const MAX_HUNT_ID = 16;

/** Everything wrong with a campaign, so the admin endpoint and the tests reject the same things. */
export function huntProblems(h: HuntDef): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9-]+$/.test(h.id) || h.id.length > MAX_HUNT_ID) out.push(`id must be lowercase letters, digits or dashes, at most ${MAX_HUNT_ID} long`);
  if (!h.name.trim()) out.push("name is required");
  if (!h.sponsor?.name?.trim()) out.push("sponsor name is required");
  if (!/^#[0-9a-fA-F]{6}$/.test(h.sponsor?.color ?? "")) out.push("sponsor color must be #rrggbb");
  if (!(h.endsAt > h.startsAt)) out.push("endsAt must be after startsAt");
  if (!h.steps?.length || h.steps.length > MAX_HUNT_STEPS) out.push(`a hunt needs 1–${MAX_HUNT_STEPS} steps`);
  for (const [i, s] of (h.steps ?? []).entries()) {
    if (!PLACE_BY_ID[s.placeId]) out.push(`step ${i + 1}: unknown place ${s.placeId}`);
    if (!s.clue?.trim()) out.push(`step ${i + 1}: clue is required`);
  }
  if (new Set((h.steps ?? []).map((s) => s.placeId)).size !== (h.steps ?? []).length) out.push("a place can only be used once per hunt");
  if (!Number.isInteger(h.supply) || h.supply < 1) out.push("supply must be a whole number of at least 1");
  if (huntMemo(h.id, h.supply).length > 28) out.push("id and supply are too long for a Stellar memo");
  if (!Number.isInteger(h.prize?.cash) || h.prize.cash < 0) out.push("prize cash must be a whole number, 0 or more");
  const st = h.prize?.stellar;
  if (st) {
    if (st.asset !== "XLM" && st.asset !== "USDT") out.push("stellar asset must be XLM or USDT");
    if (!/^\d+(\.\d{1,7})?$/.test(st.amount) || Number(st.amount) <= 0) out.push("stellar amount must be a positive number with at most 7 decimals");
  }
  return out;
}

/** The on-chain memo on a prize payment, so anyone can match a payout to its campaign and finishing place. */
export function huntMemo(huntId: string, rank: number) {
  return `hunt:${huntId}#${rank}`;
}

const DAY = 86_400_000;

export const LAUNCH_HUNTS: HuntDef[] = [
  {
    id: "bk-season-0",
    name: "Brooklyn Treasure Hunt: Season 0",
    blurb: "Five stops across Brooklyn. Solve the clue, get there, search the spot. The first 100 to find all five win.",
    sponsor: { name: "New York Life", color: "#f3a712" },
    startsAt: Date.UTC(2026, 9, 15),
    endsAt: Date.UTC(2026, 9, 15) + 30 * DAY,
    supply: 100,
    prize: { cash: 250, stellar: { asset: "XLM", amount: "10" } },
    steps: [
      { placeId: "grimaldis", clue: "Coal oven, Front Street, and a line out the door in the shadow of a bridge." },
      { placeId: "maria-hernandez-courts", clue: "Off Knickerbocker, the next game gets called from the fence." },
      { placeId: "peaches-hothouse", clue: "Bed-Stuy's hottest house is a kitchen. Ask for the chicken." },
      { placeId: "kings-theatre", clue: "A 1929 movie palace on Flatbush, all gold leaf and red velvet." },
      { placeId: "drummers-grove", clue: "Sunday afternoons, the whole park keeps time here." },
    ],
  },
];
