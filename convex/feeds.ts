/** Pure parsers for the public NYC feeds (PRD §6.9). No Convex imports so they stay easy to test. */

export const BROOKLYN_LINES = ["L", "G", "A", "C", "J", "M", "Z", "2", "3", "4", "5", "B", "Q", "F", "R", "N", "D"] as const;
export type LineStatus = { line: string; status: "good" | "delays" | "suspended" | "planned"; text: string };

const RANK = { good: 0, planned: 1, delays: 2, suspended: 3 } as const;

interface MtaAlertEntity {
  alert?: {
    active_period?: { start?: number; end?: number }[];
    informed_entity?: { route_id?: string }[];
    header_text?: { translation?: { text: string; language: string }[] };
    "transit_realtime.mercury_alert"?: { alert_type?: string };
  };
}

function classify(alertType: string): LineStatus["status"] {
  const t = alertType.toLowerCase();
  if (t.includes("suspend") || t.includes("no trains")) return "suspended";
  if (t.includes("delay") || t.includes("slow")) return "delays";
  if (t.includes("planned") || t.includes("reroute") || t.includes("express") || t.includes("local")) return "planned";
  return "delays";
}

/** MTA subway alerts JSON → worst active status per Brooklyn line. */
export function parseMtaAlerts(json: { entity?: MtaAlertEntity[] }, nowSec: number): LineStatus[] {
  const worst = new Map<string, LineStatus>();
  for (const e of json.entity ?? []) {
    const a = e.alert;
    if (!a) continue;
    const periods = a.active_period ?? [];
    const active =
      periods.length === 0 || periods.some((p) => (p.start ?? 0) <= nowSec && (p.end === undefined || p.end === 0 || p.end >= nowSec));
    if (!active) continue;
    const status = classify(a["transit_realtime.mercury_alert"]?.alert_type ?? "");
    const text = a.header_text?.translation?.find((t) => t.language === "en")?.text ?? "";
    for (const ie of a.informed_entity ?? []) {
      const line = ie.route_id;
      if (!line || !(BROOKLYN_LINES as readonly string[]).includes(line)) continue;
      const prev = worst.get(line);
      if (!prev || RANK[status] > RANK[prev.status]) worst.set(line, { line, status, text: text.slice(0, 240) });
    }
  }
  return BROOKLYN_LINES.map((line) => worst.get(line) ?? { line, status: "good" as const, text: "" });
}

/** Deterministic stand-in values when a feed has been down for over an hour. */
export function simulatedSubway(now: number): LineStatus[] {
  const hour = Math.floor(now / 3_600_000);
  return BROOKLYN_LINES.map((line, i) =>
    (hour + i) % 7 === 0
      ? { line, status: "delays" as const, text: `[${line}] trains are running with delays (simulated).` }
      : { line, status: "good" as const, text: "" },
  );
}

export function simulatedWeather(now: number) {
  const hour = Math.floor(now / 3_600_000);
  return { tempF: 55 + ((hour * 7) % 20), summary: "Partly Cloudy", precipChance: (hour * 13) % 40, alerts: [] as string[] };
}

export function simulated311(now: number) {
  const hour = Math.floor(now / 3_600_000);
  const types = ["Noise - Residential", "Illegal Parking", "HEAT/HOT WATER", "Rodent", "Blocked Driveway"];
  return types.map((type, i) => ({ type, count: 3 + ((hour + i * 5) % 12) })).sort((a, b) => b.count - a.count);
}

/** Group 311 rows into the top complaint types. */
export function top311(rows: { complaint_type?: string }[], limit = 5) {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.complaint_type) counts.set(r.complaint_type, (counts.get(r.complaint_type) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
