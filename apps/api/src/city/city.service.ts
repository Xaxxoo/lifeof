import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { upsertMoodlet, type Moodlet } from "@nyl/game-core";
import { isHomeRoom, roomDef } from "@nyl/content";
import { CityState } from "../entities/city-state.entity";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import {
  parseMtaAlerts,
  simulatedSubway,
  simulatedWeather,
  simulated311,
  group311,
} from "./feeds";

const KEY = "nyc";
const STALE_LIVE_MS = 60 * 60_000;
const BK = { lat: 40.6782, lon: -73.9442 };
const MTA_ALERTS = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json";
const NWS_POINT = `https://api.weather.gov/points/${BK.lat},${BK.lon}`;
const NWS_ALERTS = `https://api.weather.gov/alerts/active?point=${BK.lat},${BK.lon}`;
const NYC_311 = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

const BLOCK_MOODLETS: Record<string, { id: string; label: string; value: number }> = {
  Rodent: { id: "block-rat", label: "Saw a rat the size of a cat", value: -3 },
  "Noise - Residential": { id: "block-noise", label: "Someone's subwoofer, again", value: -2 },
  "Noise - Street/Sidewalk": { id: "block-noise", label: "Block party you weren't invited to", value: -2 },
  "Illegal Parking": { id: "block-parking", label: "Double-parked chaos", value: -1 },
  "Blocked Driveway": { id: "block-parking", label: "A car is blocking everything", value: -1 },
};

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(CityState) private cityStates: Repository<CityState>,
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Presence) private presence: Repository<Presence>,
  ) {}

  async get() {
    return this.cityStates.findOne({ where: { key: KEY } });
  }

  async ensureState(): Promise<CityState> {
    const existing = await this.cityStates.findOne({ where: { key: KEY } });
    if (existing) return existing;
    const now = Date.now();
    const state = this.cityStates.create({
      key: KEY,
      subway: { lines: simulatedSubway(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
      weather: { ...simulatedWeather(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
      blockEvents: { items: simulated311(now), source: "simulated", updatedAt: now, lastLiveAt: 0 },
    });
    return this.cityStates.save(state);
  }

  arrivalMoodlets(city: CityState | null, roomId: string, moodlets: Moodlet[], now: number): Moodlet[] {
    const room = roomDef(roomId);
    if (!city || !room || (room.kind !== "street" && room.kind !== "park")) return moodlets;
    const top = city.blockEvents.items.find((i) => i.neighborhood === roomId);
    const m = top ? BLOCK_MOODLETS[top.type] : undefined;
    if (!m) return moodlets;
    return upsertMoodlet(moodlets, { ...m, expiresAt: now + 3_600_000 }, now);
  }

  // --- Feed pollers ---

  async pollSubway() {
    try {
      const res = await fetch(MTA_ALERTS, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`MTA → ${res.status}`);
      const json = await res.json();
      const lines = parseMtaAlerts(json, Math.floor(Date.now() / 1000));
      await this.writeSubway(lines);
    } catch (err) {
      console.warn("subway feed failed", err);
      await this.writeSubway(null);
    }
  }

  async pollWeather() {
    const ua = process.env.NWS_USER_AGENT ?? "NewYorkLifeGame/0.1 (dev)";
    const headers = { Accept: "application/json", "User-Agent": ua };
    try {
      const pointRes = await fetch(NWS_POINT, { headers });
      if (!pointRes.ok) throw new Error(`NWS point → ${pointRes.status}`);
      const point = (await pointRes.json()) as { properties: { forecastHourly: string } };

      const hourlyRes = await fetch(point.properties.forecastHourly, { headers });
      if (!hourlyRes.ok) throw new Error(`NWS forecast → ${hourlyRes.status}`);
      const hourly = (await hourlyRes.json()) as {
        properties: {
          periods: { temperature: number; shortForecast: string; probabilityOfPrecipitation?: { value: number | null } }[];
        };
      };
      const now = hourly.properties.periods[0];
      if (!now) throw new Error("no forecast periods");

      const alertsRes = await fetch(NWS_ALERTS, { headers });
      if (!alertsRes.ok) throw new Error(`NWS alerts → ${alertsRes.status}`);
      const alerts = (await alertsRes.json()) as {
        features: { properties: { headline?: string; event?: string } }[];
      };

      await this.writeWeather({
        tempF: now.temperature,
        summary: now.shortForecast,
        precipChance: now.probabilityOfPrecipitation?.value ?? 0,
        alerts: alerts.features
          .map((f) => f.properties.event ?? f.properties.headline ?? "")
          .filter(Boolean)
          .slice(0, 3),
      });
    } catch (err) {
      console.warn("weather feed failed", err);
      await this.writeWeather(null);
    }
  }

  async poll311() {
    const since = new Date(Date.now() - 6 * 3_600_000).toISOString().slice(0, 19);
    const params = new URLSearchParams({
      borough: "BROOKLYN",
      $select: "complaint_type,incident_zip",
      $where: `created_date > '${since}'`,
      $limit: "1000",
    });
    const token = process.env.SOCRATA_APP_TOKEN;
    try {
      const res = await fetch(`${NYC_311}?${params}`, {
        headers: token ? { Accept: "application/json", "X-App-Token": token } : { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`311 → ${res.status}`);
      const rows = (await res.json()) as { complaint_type?: string; incident_zip?: string }[];
      await this.writeBlockEvents(group311(rows));
    } catch (err) {
      console.warn("311 feed failed", err);
      await this.writeBlockEvents(null);
    }
  }

  async heatCheck() {
    const city = await this.cityStates.findOne({ where: { key: KEY } });
    if (!city || city.weather.tempF >= 45) return 0;
    const now = Date.now();
    const rows = await this.presence.find({ take: 1000 });
    let hit = 0;
    for (const p of rows) {
      if (!isHomeRoom(p.roomId) || Math.random() > 0.35) continue;
      const c = await this.characters.findOneBy({ id: p.characterId });
      if (!c) continue;
      await this.characters.update(c.id, {
        moodlets: upsertMoodlet(
          c.moodlets,
          {
            id: "heat-out",
            label: `Heat's out. It's ${Math.round(city.weather.tempF)}°F outside`,
            value: -12,
            expiresAt: now + 3 * 3_600_000,
          },
          now,
        ),
      });
      hit++;
    }
    return hit;
  }

  // --- Internal write helpers ---

  private async writeSubway(lines: CityState["subway"]["lines"] | null) {
    const s = await this.ensureState();
    const now = Date.now();
    if (lines) {
      await this.cityStates.update(s.id, {
        subway: { lines, source: "live", updatedAt: now, lastLiveAt: now },
      });
    } else if (now - s.subway.lastLiveAt > STALE_LIVE_MS) {
      await this.cityStates.update(s.id, {
        subway: { ...s.subway, lines: simulatedSubway(now), source: "simulated", updatedAt: now },
      });
    }
  }

  private async writeWeather(
    weather: { tempF: number; summary: string; precipChance: number; alerts: string[] } | null,
  ) {
    const s = await this.ensureState();
    const now = Date.now();
    if (weather) {
      await this.cityStates.update(s.id, {
        weather: { ...weather, source: "live", updatedAt: now, lastLiveAt: now },
      });
    } else if (now - s.weather.lastLiveAt > STALE_LIVE_MS) {
      await this.cityStates.update(s.id, {
        weather: { ...simulatedWeather(now), source: "simulated", updatedAt: now, lastLiveAt: s.weather.lastLiveAt },
      });
    }
  }

  private async writeBlockEvents(items: CityState["blockEvents"]["items"] | null) {
    const s = await this.ensureState();
    const now = Date.now();
    if (items) {
      await this.cityStates.update(s.id, {
        blockEvents: { items, source: "live", updatedAt: now, lastLiveAt: now },
      });
    } else if (now - s.blockEvents.lastLiveAt > STALE_LIVE_MS) {
      await this.cityStates.update(s.id, {
        blockEvents: { items: simulated311(now), source: "simulated", updatedAt: now, lastLiveAt: s.blockEvents.lastLiveAt },
      });
    }
  }
}
