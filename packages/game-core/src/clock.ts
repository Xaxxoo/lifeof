/** World time is real New York time (PRD §5, "The clock"). */
export const NYC_TZ = "America/New_York";

export interface NycTime {
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  label: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Calendar date in New York as YYYY-MM-DD. */
export function nycDateKey(now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NYC_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(now),
  );
}

/** Rent is due every Sunday at 8 PM New York time (PRD §5). */
export const RENT_DUE = { weekday: 0, hour: 20 } as const;

/**
 * The rent period a moment belongs to, named by the NYC date of the most recent Sunday 8 PM.
 * When this changes, a week's rent is due.
 */
export function rentPeriodKey(now: number = Date.now()): string {
  const t = nycTime(now);
  const [y, m, d] = nycDateKey(now).split("-").map(Number) as [number, number, number];
  let back = t.weekday - RENT_DUE.weekday;
  if (back < 0) back += 7;
  if (back === 0 && t.hour < RENT_DUE.hour) back = 7;
  return new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
}

export function nycTime(now: number = Date.now()): NycTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekday = WEEKDAYS.indexOf(get("weekday"));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return {
    hour,
    minute,
    weekday,
    label: `${WEEKDAYS[weekday] ?? ""} ${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`,
  };
}

/** Opening hours in NYC time. `close` may be past midnight (e.g. open 17, close 4). */
export function isOpenAt(hours: { open: number; close: number } | "24/7", t: NycTime): boolean {
  if (hours === "24/7") return true;
  const h = t.hour + t.minute / 60;
  return hours.open <= hours.close ? h >= hours.open && h < hours.close : h >= hours.open || h < hours.close;
}

/** 0 at midnight, 1 at noon: drives scene lighting. */
export function daylight(t: NycTime): number {
  const h = t.hour + t.minute / 60;
  return Math.max(0, Math.cos(((h - 12) / 12) * Math.PI) * 0.5 + 0.5);
}
