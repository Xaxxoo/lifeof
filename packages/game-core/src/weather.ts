import type { Needs } from "./needs";

export interface WeatherNow {
  tempF: number;
  summary: string;
}

export type WeatherKind = "rain" | "snow" | null;

export function weatherKind(summary: string): WeatherKind {
  if (/snow|flurr|sleet|blizzard/i.test(summary)) return "snow";
  if (/rain|shower|drizzle|storm|thunder/i.test(summary)) return "rain";
  return null;
}

/**
 * Real Brooklyn weather changes how fast needs drop (PRD §6.9, Live City).
 * Capped so the real world can never wreck a player: no multiplier above 1.4.
 */
export function weatherNeedMultipliers(w: WeatherNow | null | undefined): Partial<Needs> {
  if (!w) return {};
  const m: Partial<Needs> = {};
  const bump = (k: keyof Needs, f: number) => {
    m[k] = Math.min(1.4, (m[k] ?? 1) * f);
  };
  const kind = weatherKind(w.summary);
  if (kind === "rain") bump("hygiene", 1.25);
  if (kind === "snow") bump("energy", 1.2);
  if (w.tempF < 40) {
    bump("energy", 1.15);
    bump("hunger", 1.1);
  }
  if (w.tempF > 85) {
    bump("energy", 1.2);
    bump("hygiene", 1.25);
  }
  return m;
}

/** One line for the Today card explaining what the weather is doing to you. */
export function weatherEffectText(w: WeatherNow | null | undefined): string | null {
  if (!w) return null;
  const parts: string[] = [];
  const kind = weatherKind(w.summary);
  if (kind === "rain") parts.push("rain: hygiene drops faster, delivery tips double");
  if (kind === "snow") parts.push("snow: energy drops faster");
  if (w.tempF < 40) parts.push("cold: you get tired and hungry faster");
  if (w.tempF > 85) parts.push("heat: energy and hygiene drop faster");
  return parts.length ? `Right now, ${parts.join("; ")}.` : null;
}
