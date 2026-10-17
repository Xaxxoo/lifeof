import { BadRequestException, Inject, Injectable, Logger, OnModuleInit, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { checkChatText } from "@nyl/game-core";
import {
  BUILD_COST,
  FACADE_COLORS,
  FACADE_STYLES,
  FOUNDABLE,
  FOUNDABLE_BY_ID,
  FOUND_COST,
  LOTS_PER_BLOCK,
  LOT_COST,
  MAX_LOTS_PER_PLAYER,
  OWNER_SHARE,
  SHOP_NAME_MAX,
  SHOP_NAME_MIN,
  SHOP_TEMPLATES,
  baseRoomId,
  registerPlayerBlocks,
  type PlayerBlockDoc,
  type PlayerShop,
} from "@nyl/content";
import { Character } from "../entities/character.entity";
import { Lot } from "../entities/lot.entity";
import { Neighborhood } from "../entities/neighborhood.entity";
import { BankService } from "../bank/bank.service";
import { EventsGateway } from "../events/events.gateway";

const SHOP_ROOM = /^shop:([a-z-]+):lot-(\d+)$/;

@Injectable()
export class NeighborhoodsService implements OnModuleInit {
  private readonly logger = new Logger(NeighborhoodsService.name);
  /** The current list, as last registered into the world. */
  private docs: PlayerBlockDoc[] = [];

  constructor(
    @InjectRepository(Neighborhood) private hoods: Repository<Neighborhood>,
    @InjectRepository(Lot) private lots: Repository<Lot>,
    @InjectRepository(Character) private characters: Repository<Character>,
    private bank: BankService,
    @Inject(forwardRef(() => EventsGateway)) private gateway: EventsGateway,
  ) {}

  async onModuleInit() {
    await this.refresh(false);
    this.logger.log(`Player neighborhoods: ${this.docs.length}`);
  }

  /** Every founded neighborhood, and what's still out there to found. */
  list() {
    const founded = new Set(this.docs.map((d) => d.id));
    return {
      blocks: this.docs,
      foundable: FOUNDABLE.map((n) => ({ id: n.id, name: n.name, borough: n.borough, streets: n.streets, station: n.station, pitch: n.pitch, founded: founded.has(n.id) })),
      prices: { found: FOUND_COST, lot: LOT_COST, build: BUILD_COST, maxLots: MAX_LOTS_PER_PLAYER, ownerShare: OWNER_SHARE },
    };
  }

  async found(token: string, neighborhoodId: string, streetName: string) {
    const c = await this.requireByToken(token);
    const hood = FOUNDABLE_BY_ID[neighborhoodId];
    if (!hood) throw new BadRequestException("That neighborhood can't be founded");
    if (!hood.streets.includes(streetName)) throw new BadRequestException(`Pick one of ${hood.streets.join(", ")}`);
    if (await this.hoods.exist({ where: { founderId: c.id } })) throw new BadRequestException("You've already founded a neighborhood");
    if (await this.ownedCount(c.id) >= MAX_LOTS_PER_PLAYER) throw new BadRequestException(`You already own ${MAX_LOTS_PER_PLAYER} lots`);
    if (Number(c.cash) < FOUND_COST) throw new BadRequestException(`Founding costs $${FOUND_COST}`);

    try {
      await this.hoods.insert({ id: hood.id, street: streetName, founderId: c.id });
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new BadRequestException(`${hood.name} was just founded by someone else`);
      throw e;
    }
    try {
      await this.bank.addMoney(c.id, -FOUND_COST, "neighborhood:found", `found:${hood.id}`, { label: `Founded ${hood.name}` });
    } catch (e) {
      await this.hoods.delete({ id: hood.id });
      throw e;
    }
    // Six empty lots; the founder's first one is free.
    await this.lots.insert(
      Array.from({ length: LOTS_PER_BLOCK }, (_, index) => ({ neighborhoodId: hood.id, index, ownerId: index === 0 ? c.id : null, shop: null })),
    );
    await this.refresh();
    return this.docs.find((d) => d.id === hood.id);
  }

  async buyLot(token: string, neighborhoodId: string, index: number) {
    const c = await this.requireByToken(token);
    const lot = await this.lots.findOneBy({ neighborhoodId, index });
    if (!lot) throw new BadRequestException("No such lot");
    if (lot.ownerId === c.id) throw new BadRequestException("You already own this lot");
    if (lot.ownerId) throw new BadRequestException("Someone already owns this lot");
    if (await this.ownedCount(c.id) >= MAX_LOTS_PER_PLAYER) throw new BadRequestException(`You can own at most ${MAX_LOTS_PER_PLAYER} lots`);
    if (Number(c.cash) < LOT_COST) throw new BadRequestException(`A lot costs $${LOT_COST}`);

    // Claim it only if it's still free, so two buyers can't both get it.
    const claimed = await this.lots.update({ id: lot.id, ownerId: IsNull() }, { ownerId: c.id, updatedAt: new Date() });
    if (!claimed.affected) throw new BadRequestException("Someone just bought this lot");
    try {
      await this.bank.addMoney(c.id, -LOT_COST, "neighborhood:lot", `lot:${lot.id}:${c.id}`, {
        label: `Lot ${index + 1} in ${FOUNDABLE_BY_ID[neighborhoodId]?.name ?? neighborhoodId}`,
      });
    } catch (e) {
      await this.lots.update({ id: lot.id, ownerId: c.id }, { ownerId: null });
      throw e;
    }
    await this.refresh();
    return this.docs.find((d) => d.id === neighborhoodId);
  }

  async build(token: string, neighborhoodId: string, index: number, input: Partial<PlayerShop>) {
    const c = await this.requireByToken(token);
    const lot = await this.lots.findOneBy({ neighborhoodId, index });
    if (!lot) throw new BadRequestException("No such lot");
    if (lot.ownerId !== c.id) throw new BadRequestException("You don't own this lot");
    const shop = validShop(input);
    await this.bank.addMoney(c.id, -BUILD_COST, "neighborhood:build", `build:${lot.id}:${Date.now()}`, {
      label: `${lot.shop ? "Redesigned" : "Built"} ${shop.name}`,
    });
    await this.lots.update({ id: lot.id }, { shop, updatedAt: new Date() });
    await this.refresh();
    return this.docs.find((d) => d.id === neighborhoodId);
  }

  /**
   * Pay a shop's owner their share when someone else spends money there.
   * Owners don't earn from their own purchases.
   */
  async payOwner(roomId: string, buyerId: string, cost: number, label: string, requestId: string) {
    const m = SHOP_ROOM.exec(baseRoomId(roomId));
    if (!m || cost <= 0) return;
    const doc = this.docs.find((d) => d.id === m[1]);
    const lot = doc?.lots.find((l) => l.index === Number(m[2]) - 1);
    if (!lot?.ownerId || !lot.shop || lot.ownerId === buyerId) return;
    const share = Math.round(cost * OWNER_SHARE);
    if (share <= 0) return;
    await this.bank.addMoney(lot.ownerId, share, "shop:sale", `sale:${requestId}`, { label: `${lot.shop.name}: ${label}` });
  }

  private async ownedCount(characterId: string) {
    return this.lots.count({ where: { ownerId: characterId } });
  }

  /** Reload from the database, put the blocks into the world, and tell clients. */
  private async refresh(broadcast = true) {
    const hoods = await this.hoods.find();
    const lots = hoods.length ? await this.lots.find({ where: { neighborhoodId: In(hoods.map((h) => h.id)) } }) : [];
    const ids = [...new Set([...hoods.map((h) => h.founderId), ...lots.flatMap((l) => (l.ownerId ? [l.ownerId] : []))])];
    const names = new Map(ids.length ? (await this.characters.find({ where: { id: In(ids) }, select: ["id", "name"] })).map((c) => [c.id, c.name]) : []);
    this.docs = hoods
      .filter((h) => FOUNDABLE_BY_ID[h.id])
      .map((h) => ({
        id: h.id,
        street: h.street,
        founderId: h.founderId,
        founderName: names.get(h.founderId) ?? "A neighbor",
        lots: lots
          .filter((l) => l.neighborhoodId === h.id)
          .sort((a, b) => a.index - b.index)
          .map((l) => ({ index: l.index, ownerId: l.ownerId, ownerName: l.ownerId ? names.get(l.ownerId) ?? null : null, shop: l.shop })),
      }));
    registerPlayerBlocks(this.docs);
    if (broadcast) this.gateway.server?.emit("neighborhoods:changed", {});
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}

/** A storefront's name, kind, color and style, checked. */
export function validShop(input: Partial<PlayerShop>): PlayerShop {
  const name = (input.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < SHOP_NAME_MIN || name.length > SHOP_NAME_MAX) {
    throw new BadRequestException(`Shop names are ${SHOP_NAME_MIN}–${SHOP_NAME_MAX} characters`);
  }
  if (/[()]/.test(name)) throw new BadRequestException("No brackets in shop names");
  if (!checkChatText(name).ok) throw new BadRequestException("Pick a different name");
  if (!input.template || !SHOP_TEMPLATES[input.template]) throw new BadRequestException("Pick what kind of shop it is");
  if (!input.color || !FACADE_COLORS.includes(input.color)) throw new BadRequestException("Pick a color");
  if (!input.arch || !FACADE_STYLES.includes(input.arch)) throw new BadRequestException("Pick a building style");
  return { name, template: input.template, color: input.color, arch: input.arch };
}
