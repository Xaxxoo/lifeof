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

export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: "postgres",
    host: config.get("DATABASE_HOST", "localhost"),
    port: config.get<number>("DATABASE_PORT", 5432),
    username: config.get("DATABASE_USER", "postgres"),
    password: config.get("DATABASE_PASSWORD", "postgres"),
    database: config.get("DATABASE_NAME", "nyl"),
    entities: [Character, Presence, PlacedObject, LedgerEntry, Message, CityState, StellarWallet, Home],
    synchronize: true,
  };
}
