import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Character } from "../entities/character.entity";
import { Home } from "../entities/home.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { BankModule } from "../bank/bank.module";
import { WorldModule } from "../world/world.module";
import { HomesController } from "./homes.controller";
import { HomesService } from "./homes.service";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Home, PlacedObject]), BankModule, WorldModule],
  controllers: [HomesController],
  providers: [HomesService],
  exports: [HomesService],
})
export class HomesModule {}
