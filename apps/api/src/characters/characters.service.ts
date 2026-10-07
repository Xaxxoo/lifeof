import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { emptySkills, rentPeriodKey, startingNeeds } from "@nyl/game-core";
import {
  BASEMENT_STARTER,
  HAIR_COLORS,
  HAIR_STYLE_IDS,
  HOME_RENT_PER_WEEK,
  ORIGIN_CASH_BONUS,
  ORIGIN_IDS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  STATUSES,
  STREET_ID,
  TRAIT_IDS,
  homeRoomId,
} from "@nyl/content";
import { Character } from "../entities/character.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { BankService } from "../bank/bank.service";

function oneOf(list: readonly string[], value: string, what: string) {
  if (!list.includes(value)) throw new BadRequestException(`Unknown ${what}`);
}

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(PlacedObject) private objects: Repository<PlacedObject>,
    private bank: BankService,
  ) {}

  async me(token: string) {
    return this.characters.findOne({ where: { token } });
  }

  async getById(id: string) {
    return this.characters.findOneByOrFail({ id });
  }

  async requireByToken(token: string) {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  async create(args: {
    token: string;
    name: string;
    origin: string;
    status: string;
    trait: string;
    look: { skin: string; shirt: string; pants: string; hair: string; hairColor: string };
  }) {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 20) throw new BadRequestException("Name must be 2–20 characters");
    if (args.token.length < 16) throw new BadRequestException("Bad session token");

    oneOf(ORIGIN_IDS, args.origin, "origin");
    oneOf(TRAIT_IDS, args.trait, "trait");
    oneOf(SKIN_TONES, args.look.skin, "skin tone");
    oneOf(SHIRT_COLORS, args.look.shirt, "shirt color");
    oneOf(PANTS_COLORS, args.look.pants, "pants color");
    oneOf(HAIR_STYLE_IDS, args.look.hair, "hairstyle");
    oneOf(HAIR_COLORS, args.look.hairColor, "hair color");

    const statusDef = STATUSES.find((s) => s.id === args.status);
    if (!statusDef) throw new BadRequestException("Unknown status");

    const existing = await this.characters.findOne({ where: { token: args.token } });
    if (existing) return existing;

    const now = Date.now();
    const character = this.characters.create({
      token: args.token,
      name,
      origin: args.origin,
      status: args.status,
      trait: args.trait,
      look: args.look,
      cash: 0,
      needs: startingNeeds(),
      needsUpdatedAt: now,
      lastSeenAt: now,
      skills: emptySkills(),
      moodlets: [],
      roomId: STREET_ID,
      shiftWeek: { period: rentPeriodKey(now), count: 0 },
      rent: { perWeek: HOME_RENT_PER_WEEK, lastPeriod: rentPeriodKey(now), owed: 0, missedWeeks: 0 },
    });
    const saved = await this.characters.save(character);

    const cash = statusDef.startingCash + (ORIGIN_CASH_BONUS[args.origin] ?? 0);
    await this.bank.addMoney(saved.id, cash, "arrival:savings", `arrival:${saved.id}`, {
      label: "Savings you arrived with",
    });

    for (const s of BASEMENT_STARTER) {
      await this.objects.save({
        roomId: homeRoomId(saved.id),
        itemId: s.itemId,
        x: s.x,
        y: s.y,
        rot: s.rot,
        paid: 0,
      });
    }

    return saved;
  }
}
