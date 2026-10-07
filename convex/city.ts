import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { parseMtaAlerts, simulated311, simulatedSubway, simulatedWeather, top311 } from "./feeds";

const KEY = "nyc";
/** Use the last good value for an hour, then switch to simulated values (PRD §6.9). */
const STALE_LIVE_MS = 60 * 60_000;
/** Center of Brooklyn, roughly Crown Heights. */
const BK = { lat: 40.6782, lon: -73.9442 };
const MTA_ALERTS = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json";
const NWS_POINT = `https://api.weather.gov/points/${BK.lat},${BK.lon}`;
const NWS_ALERTS = `https://api.weather.gov/alerts/active?point=${BK.lat},${BK.lon}`;
const NYC_311 = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

const lineStatus = v.object({
  line: v.string(),
  status: v.union(v.literal("good"), v.literal("delays"), v.literal("suspended"), v.literal("planned")),
  text: v.string(),
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cityState")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
  },
});

async function ensureState(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("cityState")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("cityState", {
    key: KEY,
    subway: { lines: simulatedSubway(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
    weather: { ...simulatedWeather(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
    blockEvents: { items: simulated311(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
  });
  return (await ctx.db.get(id))!;
}

export const writeSubway = internalMutation({
  args: { lines: v.optional(v.array(lineStatus)) },
  handler: async (ctx, { lines }) => {
    const s = await ensureState(ctx);
    const now = Date.now();
    if (lines) {
      await ctx.db.patch(s._id, { subway: { lines, source: "live", updatedAt: now, lastLiveAt: now } });
    } else if (now - s.subway.lastLiveAt > STALE_LIVE_MS) {
      await ctx.db.patch(s._id, { subway: { ...s.subway, lines: simulatedSubway(now), source: "simulated", updatedAt: now } });
    }
  },
});

export const writeWeather = internalMutation({
  args: {
    weather: v.optional(
      v.object({ tempF: v.number(), summary: v.string(), precipChance: v.number(), alerts: v.array(v.string()) }),
    ),
  },
  handler: async (ctx, { weather }) => {
    const s = await ensureState(ctx);
    const now = Date.now();
    if (weather) {
      await ctx.db.patch(s._id, { weather: { ...weather, source: "live", updatedAt: now, lastLiveAt: now } });
    } else if (now - s.weather.lastLiveAt > STALE_LIVE_MS) {
      await ctx.db.patch(s._id, {
        weather: { ...simulatedWeather(now), source: "simulated", updatedAt: now, lastLiveAt: s.weather.lastLiveAt },
      });
    }
  },
});

export const writeBlockEvents = internalMutation({
  args: { items: v.optional(v.array(v.object({ type: v.string(), count: v.number() }))) },
  handler: async (ctx, { items }) => {
    const s = await ensureState(ctx);
    const now = Date.now();
    if (items) {
      await ctx.db.patch(s._id, { blockEvents: { items, source: "live", updatedAt: now, lastLiveAt: now } });
    } else if (now - s.blockEvents.lastLiveAt > STALE_LIVE_MS) {
      await ctx.db.patch(s._id, {
        blockEvents: { items: simulated311(now), source: "simulated", updatedAt: now, lastLiveAt: s.blockEvents.lastLiveAt },
      });
    }
  },
});

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.json();
}

export const pollSubway = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const json = (await getJson(MTA_ALERTS)) as Parameters<typeof parseMtaAlerts>[0];
      await ctx.runMutation(internal.city.writeSubway, { lines: parseMtaAlerts(json, Math.floor(Date.now() / 1000)) });
    } catch (err) {
      console.warn("subway feed failed", err);
      await ctx.runMutation(internal.city.writeSubway, {});
    }
  },
});

export const pollWeather = internalAction({
  args: {},
  handler: async (ctx) => {
    // NWS asks every client to identify itself with a User-Agent.
    const ua = { "User-Agent": process.env.NWS_USER_AGENT ?? "NewYorkLifeGame/0.1 (dev)" };
    try {
      const point = (await getJson(NWS_POINT, ua)) as { properties: { forecastHourly: string } };
      const hourly = (await getJson(point.properties.forecastHourly, ua)) as {
        properties: {
          periods: { temperature: number; shortForecast: string; probabilityOfPrecipitation?: { value: number | null } }[];
        };
      };
      const now = hourly.properties.periods[0];
      if (!now) throw new Error("no forecast periods");
      const alerts = (await getJson(NWS_ALERTS, ua)) as { features: { properties: { headline?: string; event?: string } }[] };
      await ctx.runMutation(internal.city.writeWeather, {
        weather: {
          tempF: now.temperature,
          summary: now.shortForecast,
          precipChance: now.probabilityOfPrecipitation?.value ?? 0,
          alerts: alerts.features
            .map((f) => f.properties.event ?? f.properties.headline ?? "")
            .filter(Boolean)
            .slice(0, 3),
        },
      });
    } catch (err) {
      console.warn("weather feed failed", err);
      await ctx.runMutation(internal.city.writeWeather, {});
    }
  },
});

export const poll311 = internalAction({
  args: {},
  handler: async (ctx) => {
    const since = new Date(Date.now() - 6 * 3_600_000).toISOString().slice(0, 19);
    const params = new URLSearchParams({
      borough: "BROOKLYN",
      $select: "complaint_type",
      $where: `created_date > '${since}'`,
      $limit: "1000",
    });
    const token = process.env.SOCRATA_APP_TOKEN;
    try {
      const rows = (await getJson(`${NYC_311}?${params}`, token ? { "X-App-Token": token } : {})) as {
        complaint_type?: string;
      }[];
      await ctx.runMutation(internal.city.writeBlockEvents, { items: top311(rows) });
    } catch (err) {
      console.warn("311 feed failed", err);
      await ctx.runMutation(internal.city.writeBlockEvents, {});
    }
  },
});
