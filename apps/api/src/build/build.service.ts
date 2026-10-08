import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { footprintTiles, inBounds, tileAt } from "@nyl/game-core";
import { ITEM_BY_ID, SELL_BACK_RATE, wallEdges } from "@nyl/content";
import { Character } from "../entities/character.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { Presence } from "../entities/presence.entity";
import { BankService } from "../bank/bank.service";
import { WorldService } from "../world/world.service";
import { crossesWall } from "../homes/homes.service";

@Injectable()
export class BuildService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(PlacedObject) private objects: Repository<PlacedObject>,
    @InjectRepository(Presence) private presenceRepo: Repository<Presence>,
    private bank: BankService,
    private world: WorldService,
  ) {}

  private async requireAtHome(token: string) {
    const c = await this.requireByToken(token);
    const roomId = c.roomId;
    const home = roomId.startsWith("home:") ? await this.world.homeById(roomId.slice("home:".length)) : null;
    if (!home || home.ownerId !== c.id) throw new BadRequestException("Build mode works in a home you own");
    if (c.activity) throw new BadRequestException("Finish what you're doing first");
    return { c, roomId };
  }

  private async validatePlacement(
    c: Character,
    roomId: string,
    itemId: string,
    x: number,
    y: number,
    rot: number,
    ignoreId?: string,
  ) {
    const item = ITEM_BY_ID[itemId];
    const room = await this.world.roomFor(roomId);
    if (!item || !room) throw new BadRequestException("Unknown item");
    if (![0, 1, 2, 3].includes(rot)) throw new BadRequestException("Bad rotation");
    const tiles = footprintTiles(x, y, item.w, item.h, rot);
    const grid = { width: room.width, height: room.height, blocked: new Set<string>() };
    if (tiles.some((t) => !inBounds(grid, t))) throw new BadRequestException("It doesn't fit there");
    if (room.home && crossesWall(tiles, wallEdges(room.home.layout.walls))) throw new BadRequestException("It won't fit through the wall");

    const taken = new Set<string>();
    for (const p of room.props) for (const t of footprintTiles(p.x, p.y, p.w, p.h)) taken.add(`${t.x},${t.y}`);
    const door = room.props.find((p) => p.kind === "door");
    const doorway = door ? `${door.x + 1},${door.y}` : null;

    const objects = await this.objects.find({ where: { roomId }, take: 200 });
    const flatTaken = new Set<string>();
    for (const o of objects) {
      if (o.id === ignoreId) continue;
      const other = ITEM_BY_ID[o.itemId];
      if (!other) continue;
      for (const t of footprintTiles(o.x, o.y, other.w, other.h, o.rot))
        (other.walkable ? flatTaken : taken).add(`${t.x},${t.y}`);
    }

    const p = await this.presenceRepo.findOne({ where: { characterId: c.id } });
    const standing = p ? tileAt({ path: p.path, startedAt: Number(p.startedAt) }, Date.now()) : null;

    for (const t of tiles) {
      const k = `${t.x},${t.y}`;
      if (item.walkable) {
        if (flatTaken.has(k)) throw new BadRequestException("Rugs can't overlap other rugs");
        if (
          taken.has(k) &&
          room.props.some((pr) =>
            footprintTiles(pr.x, pr.y, pr.w, pr.h).some((s) => s.x === t.x && s.y === t.y),
          )
        ) {
          throw new BadRequestException("Something is already there");
        }
        continue;
      }
      if (taken.has(k)) throw new BadRequestException("Something is already there");
      if (k === doorway) throw new BadRequestException("Keep the front door clear");
      if (standing && standing.x === t.x && standing.y === t.y) throw new BadRequestException("You're standing there");
    }
    return item;
  }

  async place(token: string, itemId: string, x: number, y: number, rot: number, requestId: string) {
    const { c, roomId } = await this.requireAtHome(token);
    const item = await this.validatePlacement(c, roomId, itemId, x, y, rot);
    if (item.price > 0) {
      await this.bank.addMoney(c.id, -item.price, "buy:furniture", `build:${requestId}`, { label: item.name });
    }
    const obj = await this.objects.save({ roomId, itemId, x, y, rot, paid: item.price });
    return obj;
  }

  async move(token: string, objectId: string, x: number, y: number, rot: number) {
    const { c, roomId } = await this.requireAtHome(token);
    const o = await this.objects.findOneBy({ id: objectId });
    if (!o || o.roomId !== roomId) throw new BadRequestException("That isn't yours");
    await this.validatePlacement(c, roomId, o.itemId, x, y, rot, o.id);
    await this.objects.update(objectId, { x, y, rot });
  }

  async sell(token: string, objectId: string) {
    const { c, roomId } = await this.requireAtHome(token);
    const o = await this.objects.findOneBy({ id: objectId });
    if (!o || o.roomId !== roomId) throw new BadRequestException("That isn't yours");
    const item = ITEM_BY_ID[o.itemId];
    const refund = Math.floor(Number(o.paid) * SELL_BACK_RATE);
    await this.objects.delete(objectId);
    if (refund > 0) {
      await this.bank.addMoney(c.id, refund, "sell:furniture", `sell:${objectId}`, {
        label: `Sold ${item?.name ?? "item"}`,
      });
    }
    return { refund };
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
