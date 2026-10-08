import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { edgeKey, footprintTiles, type Tile } from "@nyl/game-core";
import {
  BUILD_PRICES,
  BUILD_REFUND_RATE,
  FLOOR_BY_ID,
  HOME_TIERS,
  ITEM_BY_ID,
  LOTS,
  LOT_BY_ID,
  PAINT_BY_ID,
  TIER_BY_ID,
  emptyLotLayout,
  homeRoom,
  wallEdges,
  type HomeLayout,
  type WallSeg,
} from "@nyl/content";
import { Character } from "../entities/character.entity";
import { Home } from "../entities/home.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { BankService } from "../bank/bank.service";
import { WorldService, homeInfo } from "../world/world.service";

/** A cab across Brooklyn to one of your homes. */
export const CAB_FARE = 12;

export type BuildOp =
  | { op: "add"; seg: WallSeg }
  | { op: "remove"; x: number; y: number; side: "n" | "w" }
  | { op: "floor"; x: number; y: number; floorId: string | null };

@Injectable()
export class HomesService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Home) private homes: Repository<Home>,
    @InjectRepository(PlacedObject) private objects: Repository<PlacedObject>,
    private world: WorldService,
    private bank: BankService,
  ) {}

  async mine(token: string) {
    const c = await this.requireByToken(token);
    const residence = await this.world.residence(c);
    const owned = await this.homes.find({ where: { ownerId: c.id } });
    return {
      residenceId: residence.id,
      homes: owned.map(homeInfo),
      unlocks: c.unlocks,
      rentPerWeek: c.rent.perWeek,
      tiers: HOME_TIERS.map(({ id, name, neighborhood, rentPerWeek, moveIn, blurb, layout }) => ({
        id, name, neighborhood, rentPerWeek, moveIn, blurb, width: layout.width, height: layout.height,
      })),
      lots: LOTS.map(({ id, name, neighborhood, width, height, price, blurb }) => ({ id, name, neighborhood, width, height, price, blurb })),
    };
  }

  /** A home's layout, for drawing it (anyone in the room can see it). */
  async layout(homeId: string) {
    const h = await this.homes.findOneBy({ id: homeId });
    if (!h) throw new BadRequestException("No such home");
    return { ...homeInfo(h), ownerId: h.ownerId };
  }

  /** Move to another rental. Your furniture comes along; anything that won't fit is refunded in full. */
  async rent(token: string, tierId: string) {
    const c = await this.requireFree(token);
    const tier = TIER_BY_ID[tierId];
    if (!tier) throw new BadRequestException("No such place");
    const current = await this.world.residence(c);
    if (current.kind === "rental" && current.defId === tierId) throw new BadRequestException("You already live here");
    if (tier.moveIn > 0) {
      await this.bank.addMoney(c.id, -tier.moveIn, "home:move-in", `move-in:${c.id}:${tierId}:${Date.now()}`, {
        label: `Move-in: ${tier.name}`,
      });
    }
    const home = await this.homes.save({
      id: randomUUID(),
      ownerId: c.id,
      kind: "rental" as const,
      defId: tierId,
      layout: structuredClone(tier.layout),
      createdAt: Date.now(),
    });
    const refunded = await this.moveIn(c, current, home, tier.rentPerWeek);
    return { homeId: home.id, refunded };
  }

  async buyLot(token: string, lotId: string) {
    const c = await this.requireByToken(token);
    const lot = LOT_BY_ID[lotId];
    if (!lot) throw new BadRequestException("No such lot");
    if (await this.homes.findOneBy({ ownerId: c.id, defId: lotId })) throw new BadRequestException("You already own this lot");
    await this.bank.addMoney(c.id, -lot.price, "home:land", `land:${c.id}:${lotId}`, { label: `Bought ${lot.name}` });
    const home = await this.homes.save({
      id: randomUUID(),
      ownerId: c.id,
      kind: "lot" as const,
      defId: lotId,
      layout: emptyLotLayout(lot),
      createdAt: Date.now(),
    });
    return homeInfo(home);
  }

  /** Make a lot you own your home. No more rent. */
  async moveInto(token: string, homeId: string) {
    const c = await this.requireFree(token);
    const home = await this.requireOwned(c, homeId);
    const current = await this.world.residence(c);
    if (current.id === home.id) throw new BadRequestException("You already live here");
    const rent = home.kind === "rental" ? TIER_BY_ID[home.defId]?.rentPerWeek ?? 0 : 0;
    const refunded = await this.moveIn(c, current, home, rent);
    return { homeId: home.id, refunded };
  }

  /** Take a cab to one of your homes from anywhere. */
  async visit(token: string, homeId: string) {
    const c = await this.requireFree(token);
    const home = await this.requireOwned(c, homeId);
    const roomId = homeRoom(home.id);
    if (c.roomId === roomId) return { roomId };
    await this.bank.addMoney(c.id, -CAB_FARE, "transit:cab", `cab:${c.id}:${Date.now()}`, { label: "Cab ride home" });
    await this.world.moveToRoom(c.id, roomId, Date.now());
    await this.characters.update(c.id, { roomId });
    return { roomId };
  }

  /** Buy (once) and apply a wall paint in the home you're standing in. */
  async paint(token: string, paintId: string) {
    const { c, home } = await this.requireInOwnHome(token);
    const paint = PAINT_BY_ID[paintId];
    if (!paint) throw new BadRequestException("No such paint");
    await this.unlock(c, "paints", paintId, paint.price, paint.name);
    await this.homes.update(home.id, { layout: { ...home.layout, paint: paintId } });
  }

  /** Buy (once) and lay a floor across the whole home. Kitchen and bathroom tiles stay. */
  async floor(token: string, floorId: string) {
    const { c, home } = await this.requireInOwnHome(token);
    const floor = FLOOR_BY_ID[floorId];
    if (!floor || floor.fixed) throw new BadRequestException("No such floor");
    if (home.kind === "lot") throw new BadRequestException("On your lot, lay floors tile by tile in Build");
    await this.unlock(c, "floors", floorId, floor.price, floor.name);
    await this.homes.update(home.id, { layout: { ...home.layout, baseFloor: floorId } });
  }

  /** Build on your own lot: walls, doors, windows and floor tiles. Removing refunds half. */
  async build(token: string, ops: BuildOp[]) {
    const { c, home } = await this.requireInOwnHome(token);
    if (home.kind !== "lot") throw new BadRequestException("You can only build on land you own");
    if (!Array.isArray(ops) || ops.length === 0 || ops.length > 400) throw new BadRequestException("Nothing to build");
    const layout: HomeLayout = structuredClone(home.layout);
    const segKey = (s: { x: number; y: number; side: string }) => `${s.x},${s.y},${s.side}`;
    const walls = new Map(layout.walls.map((w) => [segKey(w), w]));
    const gate = `0,${layout.height - 2},w`;
    let cost = 0;
    let refund = 0;

    for (const o of ops) {
      if (o.op === "add") {
        const s = o.seg;
        if (!edgeInLot(layout, s)) throw new BadRequestException("That's off your lot");
        if (segKey(s) === gate) throw new BadRequestException("Keep the gate clear");
        if (!["wall", "door", "window"].includes(s.kind)) throw new BadRequestException("Unknown wall");
        const old = walls.get(segKey(s));
        if (old?.kind === s.kind) continue;
        if (old) refund += BUILD_PRICES[old.kind] * BUILD_REFUND_RATE;
        cost += BUILD_PRICES[s.kind];
        walls.set(segKey(s), { x: s.x, y: s.y, side: s.side, kind: s.kind });
      } else if (o.op === "remove") {
        const old = walls.get(segKey(o));
        if (!old) continue;
        refund += BUILD_PRICES[old.kind] * BUILD_REFUND_RATE;
        walls.delete(segKey(o));
      } else if (o.op === "floor") {
        if (o.x < 0 || o.y < 0 || o.x >= layout.width || o.y >= layout.height) throw new BadRequestException("That's off your lot");
        const k = `${o.x},${o.y}`;
        if (o.floorId === null) {
          if (layout.floors[k]) refund += BUILD_PRICES.floor * BUILD_REFUND_RATE;
          delete layout.floors[k];
          continue;
        }
        const f = FLOOR_BY_ID[o.floorId];
        if (!f) throw new BadRequestException("No such floor");
        if (!f.fixed && !c.unlocks.floors.includes(f.id) && f.price > 0) {
          throw new BadRequestException(`Buy ${f.name} first`);
        }
        if (layout.floors[k] === o.floorId) continue;
        if (!layout.floors[k]) cost += BUILD_PRICES.floor;
        layout.floors[k] = o.floorId;
      }
    }
    layout.walls = [...walls.values()];

    // Walls can't cut through furniture that spans two tiles.
    const edges = wallEdges(layout.walls);
    const objs = await this.objects.find({ where: { roomId: homeRoom(home.id) } });
    for (const ob of objs) {
      const item = ITEM_BY_ID[ob.itemId];
      if (item && crossesWall(footprintTiles(ob.x, ob.y, item.w, item.h, ob.rot), edges)) {
        throw new BadRequestException(`A wall would go through your ${item.name.toLowerCase()}`);
      }
    }

    const net = Math.round(cost - refund);
    if (net !== 0) {
      await this.bank.addMoney(c.id, -net, net > 0 ? "home:build" : "home:demolish", `build:${home.id}:${Date.now()}`, {
        label: net > 0 ? "Building materials" : "Salvaged materials",
      });
    }
    await this.homes.update(home.id, { layout });
    return { cost: Math.round(cost), refund: Math.round(refund) };
  }

  /** Buy a floor type for your lot without laying it yet. */
  async unlockFloor(token: string, floorId: string) {
    const c = await this.requireByToken(token);
    const floor = FLOOR_BY_ID[floorId];
    if (!floor || floor.fixed) throw new BadRequestException("No such floor");
    await this.unlock(c, "floors", floorId, floor.price, floor.name);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async moveIn(c: Character, from: Home, to: Home, rentPerWeek: number) {
    const refunded = await this.carryFurniture(c, from, to);
    if (from.kind === "rental") await this.homes.delete(from.id);
    await this.characters.update(c.id, { homeId: to.id, rent: { ...c.rent, perWeek: rentPerWeek } });
    if (c.roomId === homeRoom(from.id)) {
      await this.world.moveToRoom(c.id, homeRoom(to.id), Date.now());
      await this.characters.update(c.id, { roomId: homeRoom(to.id) });
    }
    return refunded;
  }

  /** Movers bring your things. Same spot if it fits, else the first free spot, else a full refund. */
  private async carryFurniture(c: Character, from: Home, to: Home): Promise<number> {
    if (from.kind === "lot") return 0; // a lot keeps its furniture; it's still yours
    const objs = await this.objects.find({ where: { roomId: homeRoom(from.id) } });
    const placed: { x: number; y: number; w: number; h: number; rot: number; walkable?: boolean }[] = [];
    const edges = wallEdges(to.layout.walls);
    const { width, height } = to.layout;
    const blockedTiles = new Set([`0,${height - 2}`, `1,${height - 2}`]);
    let refunded = 0;

    const fits = (x: number, y: number, w: number, h: number, rot: number, walkable?: boolean) => {
      const tiles = footprintTiles(x, y, w, h, rot);
      if (tiles.some((t) => t.x < 0 || t.y < 0 || t.x >= width || t.y >= height || blockedTiles.has(`${t.x},${t.y}`))) return false;
      if (crossesWall(tiles, edges)) return false;
      for (const p of placed) {
        if (!!p.walkable !== !!walkable) continue;
        const other = new Set(footprintTiles(p.x, p.y, p.w, p.h, p.rot).map((t) => `${t.x},${t.y}`));
        if (tiles.some((t) => other.has(`${t.x},${t.y}`))) return false;
      }
      return true;
    };

    // Bathroom things go in the bathroom, kitchen things in the kitchen, if the new place has one.
    const zoneOf = (cat: string) => (cat === "Bath" ? "bath-tile" : cat === "Kitchen" ? "kitchen-tile" : null);
    const inZone = (x: number, y: number, w: number, h: number, rot: number, zone: string) =>
      footprintTiles(x, y, w, h, rot).every((t) => to.layout.floors[`${t.x},${t.y}`] === zone);
    const hasZone = (zone: string) => Object.values(to.layout.floors).includes(zone);

    for (const o of objs) {
      const item = ITEM_BY_ID[o.itemId];
      if (!item) continue;
      const zone = zoneOf(item.category);
      const wantZone = zone && hasZone(zone) ? zone : null;
      let spot: { x: number; y: number; rot: number } | null =
        fits(o.x, o.y, item.w, item.h, o.rot, item.walkable) && (!wantZone || inZone(o.x, o.y, item.w, item.h, o.rot, wantZone)) ? o : null;
      for (let y = 0; !spot && wantZone && y < height; y++) {
        for (let x = 1; !spot && x < width; x++) {
          for (const rot of [0, 1]) {
            if (!spot && inZone(x, y, item.w, item.h, rot, wantZone) && fits(x, y, item.w, item.h, rot, item.walkable)) spot = { x, y, rot };
          }
        }
      }
      if (!spot && fits(o.x, o.y, item.w, item.h, o.rot, item.walkable)) spot = o;
      for (let y = 0; !spot && y < height; y++) {
        for (let x = 1; !spot && x < width; x++) {
          for (const rot of [0, 1]) if (!spot && fits(x, y, item.w, item.h, rot, item.walkable)) spot = { x, y, rot };
        }
      }
      if (spot) {
        placed.push({ ...spot, w: item.w, h: item.h, walkable: item.walkable });
        await this.objects.update(o.id, { roomId: homeRoom(to.id), x: spot.x, y: spot.y, rot: spot.rot });
      } else {
        await this.objects.delete(o.id);
        const paid = Number(o.paid);
        if (paid > 0) {
          refunded += paid;
          await this.bank.addMoney(c.id, paid, "sell:furniture", `moving:${o.id}`, { label: `${item.name} didn't fit (refunded)` });
        }
      }
    }
    return refunded;
  }

  private async unlock(c: Character, kind: "paints" | "floors", id: string, price: number, name: string) {
    if (c.unlocks[kind].includes(id)) return;
    if (price > 0) await this.bank.addMoney(c.id, -price, `buy:${kind}`, `unlock:${c.id}:${kind}:${id}`, { label: name });
    await this.characters.update(c.id, { unlocks: { ...c.unlocks, [kind]: [...c.unlocks[kind], id] } });
  }

  private async requireInOwnHome(token: string) {
    const c = await this.requireByToken(token);
    if (!c.roomId.startsWith("home:")) throw new BadRequestException("Do this at home");
    const home = await this.requireOwned(c, c.roomId.slice("home:".length));
    return { c, home };
  }

  private async requireOwned(c: Character, homeId: string) {
    const home = await this.homes.findOneBy({ id: homeId });
    if (!home || home.ownerId !== c.id) throw new BadRequestException("That isn't yours");
    return home;
  }

  private async requireFree(token: string) {
    const c = await this.requireByToken(token);
    if (c.roomId === "work" || c.roomId === "transit") throw new BadRequestException("Not right now");
    if (c.activity) throw new BadRequestException("Finish what you're doing first");
    return c;
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}

function edgeInLot(l: HomeLayout, s: { x: number; y: number; side: string }) {
  if (s.side === "n") return s.x >= 0 && s.x < l.width && s.y >= 0 && s.y <= l.height;
  if (s.side === "w") return s.x >= 0 && s.x <= l.width && s.y >= 0 && s.y < l.height;
  return false;
}

/** Does a multi-tile footprint have a wall running between two of its own tiles? */
export function crossesWall(tiles: Tile[], edges: ReadonlySet<string>): boolean {
  const inside = new Set(tiles.map((t) => `${t.x},${t.y}`));
  for (const t of tiles) {
    for (const n of [{ x: t.x + 1, y: t.y }, { x: t.x, y: t.y + 1 }]) {
      if (inside.has(`${n.x},${n.y}`) && edges.has(edgeKey(t, n))) return true;
    }
  }
  return false;
}
