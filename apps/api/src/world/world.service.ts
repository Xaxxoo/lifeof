import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import {
  decayNeeds,
  findPath,
  tileAt,
  weatherNeedMultipliers,
  type Needs,
  type RoomGrid,
} from "@nyl/game-core";
import {
  BASEMENT_STARTER,
  STREET_ID,
  TIER_BY_ID,
  buildRoomLayout,
  homeRoom,
  homeRoomDef,
  isHomeRoom,
  roomDef,
  type HomeInfo,
  type Interactable,
  type RoomDef,
} from "@nyl/content";
import { Home } from "../entities/home.entity";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { CityState } from "../entities/city-state.entity";

const STALE_MS = 45_000;
const OFFLINE_GAP_MS = 2 * 60_000;

export interface LoadedRoom {
  room: RoomDef;
  grid: RoomGrid;
  objects: PlacedObject[];
  interactables: Map<string, Interactable>;
}

@Injectable()
export class WorldService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Presence) private presenceRepo: Repository<Presence>,
    @InjectRepository(PlacedObject) private objects: Repository<PlacedObject>,
    @InjectRepository(CityState) private cityStates: Repository<CityState>,
    @InjectRepository(Home) private homes: Repository<Home>,
  ) {}

  /** Any room by id; homes come from their saved layout. */
  async roomFor(roomId: string): Promise<RoomDef | null> {
    if (!isHomeRoom(roomId)) return roomDef(roomId);
    const home = await this.homes.findOneBy({ id: roomId.slice("home:".length) });
    return home ? homeRoomDef(roomId, homeInfo(home)) : roomDef(roomId);
  }

  async homeById(id: string): Promise<Home | null> {
    return this.homes.findOneBy({ id });
  }

  /**
   * Where this character lives. Everyone starts in a basement rental whose id is their own id,
   * which is also where older saves already keep their furniture.
   */
  async residence(c: Character): Promise<Home> {
    if (c.homeId) {
      const h = await this.homes.findOneBy({ id: c.homeId });
      if (h) return h;
    }
    const existing = await this.homes.findOneBy({ id: c.id });
    const home =
      existing ??
      (await this.homes.save({
        id: c.id,
        ownerId: c.id,
        kind: "rental" as const,
        defId: "basement",
        layout: structuredClone(TIER_BY_ID.basement!.layout),
        createdAt: Date.now(),
      }));
    await this.characters.update(c.id, { homeId: home.id });
    c.homeId = home.id;
    return home;
  }

  /** A brand-new character's basement, with the starter furniture. */
  async createStarterHome(c: Character) {
    const home = await this.residence(c);
    for (const s of BASEMENT_STARTER) {
      await this.objects.save({ roomId: homeRoom(home.id), itemId: s.itemId, x: s.x, y: s.y, rot: s.rot, paid: 0 });
    }
    return home;
  }

  currentNeeds(c: Character, now: number, city?: CityState | null): Needs {
    const offline = now - Number(c.lastSeenAt) > OFFLINE_GAP_MS;
    return decayNeeds(c.needs, Number(c.needsUpdatedAt), now, {
      offline,
      multipliers: offline ? undefined : weatherNeedMultipliers(city?.weather),
    });
  }

  async getCity(): Promise<CityState | null> {
    return this.cityStates.findOne({ where: { key: "nyc" } });
  }

  async presenceOf(characterId: string): Promise<Presence | null> {
    return this.presenceRepo.findOne({ where: { characterId } });
  }

  async loadRoom(roomId: string): Promise<LoadedRoom> {
    const room = await this.roomFor(roomId);
    if (!room) throw new BadRequestException("Unknown room");
    const objects = await this.objects.find({ where: { roomId }, take: 200 });
    const placed = objects.map((o) => ({ _id: o.id, itemId: o.itemId, x: o.x, y: o.y, rot: o.rot }));
    const { grid, interactables } = buildRoomLayout(room, placed);
    return { room, grid, objects, interactables };
  }

  async ensurePresence(c: Character, now: number): Promise<Presence | null> {
    if (c.roomId === "work" || c.roomId === "transit") return null;
    const existing = await this.presenceOf(c.id);
    if (existing) return existing;
    const room = await this.roomFor(c.roomId);
    if (!room) return null;
    const p = this.presenceRepo.create({
      characterId: c.id,
      roomId: c.roomId,
      path: [room.spawn],
      startedAt: now,
      updatedAt: now,
    });
    return this.presenceRepo.save(p);
  }

  async join(token: string) {
    const c = await this.requireByToken(token);
    const now = Date.now();
    await this.characters.update(c.id, {
      needs: this.currentNeeds(c, now),
      needsUpdatedAt: now,
      lastSeenAt: now,
    });
    if (c.roomId === "work" || c.roomId === "transit") {
      return { serverNow: now, roomId: c.roomId };
    }

    const roomId = (await this.roomFor(c.roomId)) ? c.roomId : STREET_ID;
    const existing = await this.presenceOf(c.id);
    if (existing && existing.roomId === roomId) {
      await this.presenceRepo.update(existing.id, { updatedAt: now });
      return { serverNow: now, roomId };
    }
    if (existing) await this.presenceRepo.delete(existing.id);
    const room = (await this.roomFor(roomId))!;
    await this.presenceRepo.save({
      characterId: c.id,
      roomId,
      path: [room.spawn],
      startedAt: now,
      updatedAt: now,
    });
    if (roomId !== c.roomId) await this.characters.update(c.id, { roomId });
    return { serverNow: now, roomId };
  }

  async move(token: string, target: { x: number; y: number }) {
    const c = await this.requireByToken(token);
    if (c.roomId === "work") throw new BadRequestException("You're at work");
    if (c.roomId === "transit") throw new BadRequestException("You're on the train");
    const now = Date.now();
    // Cancel activity handled by play service externally before calling this
    const p = await this.ensurePresence(c, now);
    if (!p) throw new BadRequestException("Not in a room");
    const { grid } = await this.loadRoom(p.roomId);
    const from = tileAt({ path: p.path, startedAt: Number(p.startedAt) }, now);
    const path = findPath(grid, from, { x: Math.round(target.x), y: Math.round(target.y) });
    if (!path) return { ok: false as const };
    await this.presenceRepo.update(p.id, { path, startedAt: now, updatedAt: now });
    await this.characters.update(c.id, { lastSeenAt: now });
    return { ok: true as const, characterId: c.id, path, startedAt: now };
  }

  async heartbeat(token: string) {
    const c = await this.requireByToken(token);
    const now = Date.now();
    const p = await this.ensurePresence(c, now);
    if (p) await this.presenceRepo.update(p.id, { updatedAt: now });
    await this.characters.update(c.id, { lastSeenAt: now });
  }

  async leave(token: string) {
    const c = await this.requireByToken(token);
    const p = await this.presenceOf(c.id);
    if (p) await this.presenceRepo.delete(p.id);
  }

  async occupants(roomId: string) {
    const rows = await this.presenceRepo.find({ where: { roomId }, take: 60 });
    const out = [];
    for (const p of rows) {
      const c = await this.characters.findOneBy({ id: p.characterId });
      if (!c) continue;
      const a = c.activity && c.activity.roomId === roomId ? c.activity : null;
      out.push({
        characterId: c.id,
        name: c.name,
        origin: c.origin,
        look: c.look,
        path: p.path,
        startedAt: Number(p.startedAt),
        activity: a
          ? { status: a.status, pose: a.pose ?? "stand", startsAt: a.startsAt, endsAt: a.endsAt, target: a.target }
          : null,
      });
    }
    return out;
  }

  async roomObjects(roomId: string) {
    return this.objects.find({ where: { roomId }, take: 200 });
  }

  async whereAmI(token: string) {
    const c = await this.requireByToken(token);
    return { roomId: c.roomId };
  }

  async cleanupPresence() {
    const cutoff = Date.now() - STALE_MS;
    await this.presenceRepo
      .createQueryBuilder()
      .delete()
      .where('"updatedAt" < :cutoff', { cutoff })
      .execute();
  }

  async moveToRoom(characterId: string, toRoomId: string, now: number, at?: { x: number; y: number }) {
    const to = await this.roomFor(toRoomId);
    if (!to) return;
    const spawn = at ?? to.spawn;
    const p = await this.presenceOf(characterId);
    if (p) {
      await this.presenceRepo.update(p.id, { roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
    } else {
      await this.presenceRepo.save({ characterId, roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
    }
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}

export function homeInfo(h: Home): HomeInfo {
  return { id: h.id, kind: h.kind, defId: h.defId, layout: h.layout };
}
