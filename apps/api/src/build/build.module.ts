import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BuildController } from "./build.controller";
import { BuildService } from "./build.service";
import { Character } from "../entities/character.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { Presence } from "../entities/presence.entity";
import { BankModule } from "../bank/bank.module";
import { WorldModule } from "../world/world.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character, PlacedObject, Presence]), BankModule, WorldModule],
  controllers: [BuildController],
  providers: [BuildService],
  exports: [BuildService],
})
export class BuildModule {}
