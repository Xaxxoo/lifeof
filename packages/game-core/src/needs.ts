/** Six needs, 0–100. Values are stored with a timestamp and decayed on read. */
export const NEED_KEYS = ["hunger", "energy", "hygiene", "bladder", "fun", "social"] as const;
export type NeedKey = (typeof NEED_KEYS)[number];
export type Needs = Record<NeedKey, number>;

/** Points lost per real hour while online (PRD §5). */
export const NEED_DECAY_PER_HOUR: Needs = {
  hunger: 25,
  energy: 15,
  hygiene: 12,
  bladder: 30,
  fun: 10,
  social: 8,
};

/** Offline autopilot never lets a need drop below this (PRD §5, "offline is autopilot"). */
export const OFFLINE_NEED_FLOOR = 20;
const HOUR_MS = 60 * 60 * 1000;

export function startingNeeds(): Needs {
  return { hunger: 80, energy: 70, hygiene: 60, bladder: 75, fun: 60, social: 40 };
}

export function clampNeed(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Needs at `now`, given values stored at `since`.
 * `multipliers` lets traits and moodlets speed up or slow down a need.
 */
export function decayNeeds(
  stored: Needs,
  since: number,
  now: number,
  opts: { offline?: boolean; multipliers?: Partial<Needs> } = {},
): Needs {
  const hours = Math.max(0, now - since) / HOUR_MS;
  const out = { ...stored };
  for (const k of NEED_KEYS) {
    const rate = NEED_DECAY_PER_HOUR[k] * (opts.multipliers?.[k] ?? 1);
    let v = stored[k] - rate * hours;
    if (opts.offline) v = Math.max(Math.min(stored[k], OFFLINE_NEED_FLOOR), v);
    out[k] = clampNeed(v);
  }
  return out;
}

export function applyNeedDelta(needs: Needs, delta: Partial<Needs>): Needs {
  const out = { ...needs };
  for (const k of NEED_KEYS) out[k] = clampNeed(out[k] + (delta[k] ?? 0));
  return out;
}

export type MoodBand = "Thriving" | "Good" | "Fine" | "Stressed" | "Burnt out";

export interface Moodlet {
  id: string;
  label: string;
  value: number;
  expiresAt: number;
}

/** Mood = average of needs, nudged by active moodlets, clamped 0–100. */
export function activeMoodlets(moodlets: Moodlet[] | undefined, now: number): Moodlet[] {
  return (moodlets ?? []).filter((m) => m.expiresAt > now);
}

/** Adds or refreshes a moodlet by id and drops expired ones. */
export function upsertMoodlet(moodlets: Moodlet[] | undefined, m: Moodlet, now: number): Moodlet[] {
  return [...activeMoodlets(moodlets, now).filter((x) => x.id !== m.id), m];
}

export function computeMood(needs: Needs, moodlets: Moodlet[] = [], now = Date.now()): number {
  const avg = NEED_KEYS.reduce((s, k) => s + needs[k], 0) / NEED_KEYS.length;
  const bonus = moodlets.filter((m) => m.expiresAt > now).reduce((s, m) => s + m.value, 0);
  return clampNeed(avg + bonus);
}

export function moodBand(mood: number): MoodBand {
  if (mood >= 80) return "Thriving";
  if (mood >= 60) return "Good";
  if (mood >= 40) return "Fine";
  if (mood >= 20) return "Stressed";
  return "Burnt out";
}

/** Pay and skill-gain multiplier by mood band (PRD §5). */
export function moodMultiplier(band: MoodBand): number {
  switch (band) {
    case "Thriving":
      return 1.2;
    case "Good":
      return 1.1;
    case "Fine":
      return 1;
    case "Stressed":
      return 0.85;
    case "Burnt out":
      return 0.7;
  }
}
