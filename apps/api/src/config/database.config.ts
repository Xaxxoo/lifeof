import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { LedgerEntry } from "../entities/ledger-entry.entity";
import { Message } from "../entities/message.entity";
import { CityState } from "../entities/city-state.entity";
import { StellarWallet } from "../entities/stellar-wallet.entity";
import { Home } from "../entities/home.entity";
import { Relationship } from "../entities/relationship.entity";
import { Block } from "../entities/block.entity";
import { Report } from "../entities/report.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { Crew } from "../entities/crew.entity";
import { CrewMember } from "../entities/crew-member.entity";
import { Listing } from "../entities/listing.entity";
import { Application } from "../entities/application.entity";
import { Lease } from "../entities/lease.entity";
import { QuestProgress } from "../entities/quest-progress.entity";

export const entities = [Character, Presence, PlacedObject, LedgerEntry, Message, CityState, StellarWallet, Home, Relationship, Block, Report, DirectMessage, Crew, CrewMember, Listing, Application, Lease, QuestProgress];

export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const isProd = config.get("NODE_ENV") === "production";
  return {
    type: "postgres",
    host: config.get("DATABASE_HOST", "localhost"),
    port: config.get<number>("DATABASE_PORT", 5432),
    username: config.get("DATABASE_USER", "postgres"),
    password: config.get("DATABASE_PASSWORD", "postgres"),
    database: config.get("DATABASE_NAME", "nyl"),
    entities,
    synchronize: !isProd,
    migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    migrationsRun: isProd,
  };
}
