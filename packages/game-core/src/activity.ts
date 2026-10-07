import { applyNeedDelta, type Needs } from "./needs";

/**
 * A timed action. The avatar walks first, so the action itself runs from `startsAt` (arrival) to `endsAt`.
 * Need changes are totals for a full run and are paid out in proportion to time done.
 */
export interface TimedActivity {
  startsAt: number;
  endsAt: number;
  needs?: Partial<Needs>;
}

export function activityProgress(a: Pick<TimedActivity, "startsAt" | "endsAt">, now: number): number {
  if (now <= a.startsAt) return 0;
  if (a.endsAt <= a.startsAt) return 1;
  return Math.min(1, (now - a.startsAt) / (a.endsAt - a.startsAt));
}

export function scaleDelta(delta: Partial<Needs> | undefined, f: number): Partial<Needs> {
  const out: Partial<Needs> = {};
  if (!delta) return out;
  for (const [k, v] of Object.entries(delta) as [keyof Needs, number][]) out[k] = v * f;
  return out;
}

/** Needs as the HUD should show them mid-action: decayed needs plus the share of the action done so far. */
export function needsDuringActivity(decayed: Needs, a: TimedActivity | null | undefined, now: number): Needs {
  if (!a?.needs) return decayed;
  return applyNeedDelta(decayed, scaleDelta(a.needs, activityProgress(a, now)));
}
