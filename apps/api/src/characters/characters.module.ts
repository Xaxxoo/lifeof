import { Module } from "@nestjs/common";
import { WorldModule } from "../world/world.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharactersController } from "./characters.controller";
import { CharactersService } from "./characters.service";
import { Character } from "../entities/character.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { BankModule } from "../bank/bank.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character, PlacedObject]), BankModule, AuthModule, WorldModule],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
