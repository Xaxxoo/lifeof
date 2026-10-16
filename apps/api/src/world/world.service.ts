import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
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
  baseRoomId,
  buildRoomLayout,
  homeRoom,
  homeRoomDef,
  instanceNumber,
  instanceRoomId,
  isHomeRoom,
  isInstanceable,
  roomDef,
  RELATIONSHIP_LEVELS,
  type HomeInfo,
  type Interactable,
  type RoomDef,
} from "@nyl/content";
import { Home } from "../entities/home.entity";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { CityState } from "../entities/city-state.entity";
import { Relationship } from "../entities/relationship.entity";
import { CrewMember } from "../entities/crew-member.entity";

const STALE_MS = 45_000;
const OFFLINE_GAP_MS = 2 * 60_000;
/** Relationship levels close enough that we try to put you in the same room copy. */
const FRIEND_LEVELS = new Set(RELATIONSHIP_LEVELS.slice(RELATIONSHIP_LEVELS.indexOf("friend")));
/** Remember which copy of a room you were last in, so stepping out of a shop returns you to the same block crowd. */
const RECENT_INSTANCE_MS = 30 * 60_000;

export interface InstanceInfo {
  roomId: string;
  instance: number;
  count: number;
  friends: { characterId: string; name: string }[];
}

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
    @InjectRepository(Relationship) private relationships: Repository<Relationship>,
    @InjectRepository(CrewMember) private crewMembers: Repository<CrewMember>,
  ) {}

  /**
   * Picking a copy and writing the presence row happen under one lock per base room, so a crowd
   * arriving at once fills copies one by one instead of all seeing the same "10 here". The lock is
   * per process: with several API servers this needs a Postgres advisory lock or Redis instead.
   */
  private roomLocks = new Map<string, Promise<unknown>>();

  private withRoomLock<T>(base: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.roomLocks.get(base) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.catch(() => {});
    this.roomLocks.set(base, tail);
    void tail.then(() => {
      if (this.roomLocks.get(base) === tail) this.roomLocks.delete(base);
    });
    return run;
  }

  /** characterId → base room → { instance room id, when }. Per process; only a preference. */
  private recentInstance = new Map<string, Map<string, { roomId: string; at: number }>>();

  /** Players per room copy: ROOM_INSTANCE_CAP if set, else the room's own capacity. */
  capacityOf(room: RoomDef): number {
    const cap = Number(process.env.ROOM_INSTANCE_CAP);
    return Number.isFinite(cap) && cap > 0 ? cap : room.capacity;
  }

  /** Any room by id; homes come from their saved layout. Instanced rooms resolve to base definition. */
  async roomFor(roomId: string): Promise<RoomDef | null> {
    const base = baseRoomId(roomId);
    if (!isHomeRoom(base)) return roomDef(base);
    const home = await this.homes.findOneBy({ id: base.slice("home:".length) });
    return home ? homeRoomDef(base, homeInfo(home)) : roomDef(base);
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
    const objects = await this.objects.find({ where: { roomId: baseRoomId(roomId) }, take: 200 });
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
    // Under the room lock and re-checked, so a heartbeat racing a join can't leave two rows.
    return this.withRoomLock(baseRoomId(c.roomId), async () => {
      const again = await this.presenceOf(c.id);
      if (again) return again;
      return this.presenceRepo.save(
        this.presenceRepo.create({ characterId: c.id, roomId: c.roomId, path: [room.spawn], startedAt: now, updatedAt: now }),
      );
    });
  }

  /** Replace whatever presence rows a character has with one. Call under withRoomLock. */
  private async placePresence(characterId: string, roomId: string, path: { x: number; y: number }[], now: number) {
    await this.presenceRepo.delete({ characterId });
    await this.presenceRepo.save({ characterId, roomId, path, startedAt: now, updatedAt: now });
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

    const existing = await this.presenceOf(c.id);
    if (existing && existing.roomId === c.roomId) {
      await this.presenceRepo.update(existing.id, { updatedAt: now });
      return { serverNow: now, roomId: c.roomId };
    }
    // Back after a while: rejoin your copy of the room if it has space, otherwise find one that does.
    const wanted = (await this.roomFor(c.roomId)) ? c.roomId : STREET_ID;
    const roomId = await this.withRoomLock(baseRoomId(wanted), async () => {
      // A second join for the same character (another tab, a retried request) may have won the lock first.
      const settled = await this.presenceOf(c.id);
      if (settled && baseRoomId(settled.roomId) === baseRoomId(wanted)) return settled.roomId;
      const id = isInstanceable(wanted) ? await this.pickInstance(baseRoomId(wanted), c.id, now, wanted) : wanted;
      const room = (await this.roomFor(id))!;
      await this.placePresence(c.id, id, [room.spawn], now);
      return id;
    });
    this.rememberInstance(c.id, roomId, now);
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
    const rows = await this.presenceRepo.find({
      where: { roomId, updatedAt: MoreThan(Date.now() - STALE_MS) },
      order: { updatedAt: "DESC" },
      take: 60,
    });
    const chars = rows.length ? await this.characters.findBy({ id: In(rows.map((p) => p.characterId)) }) : [];
    const byId = new Map(chars.map((c) => [c.id, c]));
    const out = [];
    for (const p of rows) {
      const c = byId.get(p.characterId);
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
    return this.objects.find({ where: { roomId: baseRoomId(roomId) }, take: 200 });
  }

  async whereAmI(token: string) {
    const c = await this.requireByToken(token);
    return { roomId: c.roomId };
  }

  async cleanupPresence() {
    const now = Date.now();
    for (const [id, rooms] of this.recentInstance) {
      for (const [base, r] of rooms) if (now - r.at > RECENT_INSTANCE_MS) rooms.delete(base);
      if (!rooms.size) this.recentInstance.delete(id);
    }
    const cutoff = now - STALE_MS;
    await this.presenceRepo
      .createQueryBuilder()
      .delete()
      .where('"updatedAt" < :cutoff', { cutoff })
      .execute();
  }

  /** Live head counts for every copy of a base room, leaving out one character (the one arriving). */
  private async instanceCounts(base: string, exceptId: string, now: number): Promise<Map<string, number>> {
    const rows: { roomId: string; n: string }[] = await this.presenceRepo
      .createQueryBuilder("p")
      .select('p."roomId"', "roomId")
      .addSelect("COUNT(*)", "n")
      .where('(p."roomId" = :base OR p."roomId" LIKE :pattern)', { base, pattern: `${base}:%` })
      .andWhere('p."characterId" != :exceptId', { exceptId })
      .andWhere('p."updatedAt" > :cutoff', { cutoff: now - STALE_MS })
      .groupBy('p."roomId"')
      .getRawMany();
    const counts = new Map<string, number>();
    for (const r of rows) if (baseRoomId(r.roomId) === base) counts.set(r.roomId, Number(r.n));
    return counts;
  }

  /** Friends (by relationship level or romance) and crewmates: the people we try to keep you with. */
  private async companionIds(characterId: string): Promise<Set<string>> {
    const rels = await this.relationships.find({ where: { characterId }, select: { targetId: true, level: true, romantic: true } });
    const ids = new Set(rels.filter((r) => FRIEND_LEVELS.has(r.level as never) || r.romantic).map((r) => r.targetId));
    const mine = await this.crewMembers.findOneBy({ characterId });
    if (mine) {
      const crew = await this.crewMembers.find({ where: { crewId: mine.crewId }, select: { characterId: true } });
      for (const m of crew) if (m.characterId !== characterId) ids.add(m.characterId);
    }
    return ids;
  }

  /**
   * Which copy of a busy room to put someone in. In order: the copy they asked for or were last in,
   * if it has space; the copy with the most of their friends and crew; the fullest copy with space
   * (so crowds stay lively instead of spreading thin); a new copy. Copies aren't limited in number.
   * Call it under withRoomLock together with the presence write, or two arrivals can both take the last spot.
   */
  async pickInstance(base: string, characterId: string, now: number, prefer?: string): Promise<string> {
    const room = await this.roomFor(base);
    if (!room || !isInstanceable(base)) return base;
    const cap = this.capacityOf(room);
    const counts = await this.instanceCounts(base, characterId, now);
    const hasSpace = (id: string) => (counts.get(id) ?? 0) < cap;

    const recent = this.recentInstance.get(characterId)?.get(base);
    for (const id of [prefer, recent && now - recent.at < RECENT_INSTANCE_MS ? recent.roomId : undefined]) {
      if (id && baseRoomId(id) === base && hasSpace(id)) return id;
    }

    const open = [...counts.keys()].filter(hasSpace);
    if (open.length) {
      const companions = await this.companionIds(characterId);
      if (companions.size) {
        const here = await this.presenceRepo.find({
          where: { roomId: In(open), characterId: In([...companions]), updatedAt: MoreThan(now - STALE_MS) },
          select: { roomId: true },
        });
        const friendsIn = new Map<string, number>();
        for (const p of here) friendsIn.set(p.roomId, (friendsIn.get(p.roomId) ?? 0) + 1);
        const best = [...friendsIn].sort((a, b) => b[1] - a[1] || instanceNumber(a[0]) - instanceNumber(b[0]))[0];
        if (best) return best[0];
      }
      open.sort((a, b) => counts.get(b)! - counts.get(a)! || instanceNumber(a) - instanceNumber(b));
      return open[0]!;
    }
    // Everything is full (or empty): the lowest copy number nobody is using.
    let n = 1;
    while (counts.has(instanceRoomId(base, n))) n++;
    return instanceRoomId(base, n);
  }

  private rememberInstance(characterId: string, roomId: string, now: number) {
    if (!isInstanceable(roomId)) return;
    let rooms = this.recentInstance.get(characterId);
    if (!rooms) this.recentInstance.set(characterId, (rooms = new Map()));
    rooms.set(baseRoomId(roomId), { roomId, at: now });
  }

  /**
   * Put a character's presence in a room and return the room id they actually landed in,
   * which for a busy room is one of its copies. Callers store that id as the character's room.
   */
  async moveToRoom(characterId: string, toRoomId: string, now: number, at?: { x: number; y: number }): Promise<string> {
    const to = await this.roomFor(toRoomId);
    if (!to) return toRoomId;
    const spawn = at ?? to.spawn;
    const finalRoomId = await this.withRoomLock(baseRoomId(toRoomId), async () => {
      const id = isInstanceable(toRoomId) ? await this.pickInstance(baseRoomId(toRoomId), characterId, now) : toRoomId;
      await this.placePresence(characterId, id, [spawn], now);
      return id;
    });
    this.rememberInstance(characterId, finalRoomId, now);
    return finalRoomId;
  }

  /** The copies of your current room, with head counts and which of your friends are in each. */
  async instances(token: string): Promise<{ roomId: string; instance: number; capacity: number; instances: InstanceInfo[] }> {
    const c = await this.requireByToken(token);
    const now = Date.now();
    const room = isInstanceable(c.roomId) ? await this.roomFor(c.roomId) : null;
    if (!room) return { roomId: c.roomId, instance: 1, capacity: 0, instances: [] };
    const base = baseRoomId(c.roomId);
    const counts = await this.instanceCounts(base, "00000000-0000-0000-0000-000000000000", now);
    counts.set(c.roomId, Math.max(counts.get(c.roomId) ?? 0, 1));
    const companions = await this.companionIds(c.id);
    const friendRows = companions.size
      ? await this.presenceRepo.find({
          where: { roomId: In([...counts.keys()]), characterId: In([...companions]), updatedAt: MoreThan(now - STALE_MS) },
        })
      : [];
    const names = friendRows.length
      ? new Map((await this.characters.findBy({ id: In(friendRows.map((f) => f.characterId)) })).map((x) => [x.id, x.name]))
      : new Map<string, string>();
    const instances = [...counts]
      .map(([roomId, count]) => ({
        roomId,
        instance: instanceNumber(roomId),
        count,
        friends: friendRows
          .filter((f) => f.roomId === roomId)
          .map((f) => ({ characterId: f.characterId, name: names.get(f.characterId) ?? "Friend" })),
      }))
      .sort((a, b) => a.instance - b.instance);
    return { roomId: c.roomId, instance: instanceNumber(c.roomId), capacity: this.capacityOf(room), instances };
  }

  /** Switch to the copy of this room a friend or crewmate is in. Returns the old and new room ids. */
  async hop(token: string, friendId: string): Promise<{ characterId: string; from: string; to: string }> {
    const c = await this.requireByToken(token);
    if (c.activity) throw new BadRequestException("Finish what you're doing first");
    if (!isInstanceable(c.roomId)) throw new BadRequestException("Nobody to join here");
    const companions = await this.companionIds(c.id);
    if (!companions.has(friendId)) throw new BadRequestException("You can only join friends and crewmates");
    const now = Date.now();
    const theirs = await this.presenceRepo.findOne({ where: { characterId: friendId, updatedAt: MoreThan(now - STALE_MS) } });
    if (!theirs || baseRoomId(theirs.roomId) !== baseRoomId(c.roomId)) throw new BadRequestException("They aren't here anymore");
    if (theirs.roomId === c.roomId) return { characterId: c.id, from: c.roomId, to: c.roomId };
    const room = (await this.roomFor(theirs.roomId))!;
    await this.withRoomLock(baseRoomId(c.roomId), async () => {
      const counts = await this.instanceCounts(baseRoomId(c.roomId), c.id, now);
      if ((counts.get(theirs.roomId) ?? 0) >= this.capacityOf(room)) throw new BadRequestException("Their side is full right now");
      // Same layout in every copy, so you stay standing where you are.
      const mine = await this.presenceOf(c.id);
      const at = mine ? tileAt({ path: mine.path, startedAt: Number(mine.startedAt) }, now) : room.spawn;
      await this.placePresence(c.id, theirs.roomId, [at], now);
    });
    await this.characters.update(c.id, { roomId: theirs.roomId, lastSeenAt: now });
    this.rememberInstance(c.id, theirs.roomId, now);
    return { characterId: c.id, from: c.roomId, to: theirs.roomId };
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
