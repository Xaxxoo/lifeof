import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Character } from "../entities/character.entity";
import { Lot } from "../entities/lot.entity";
import { Neighborhood } from "../entities/neighborhood.entity";
import { BankModule } from "../bank/bank.module";
import { EventsModule } from "../events/events.module";
import { NeighborhoodsController } from "./neighborhoods.controller";
import { NeighborhoodsService } from "./neighborhoods.service";

@Module({
  imports: [TypeOrmModule.forFeature([Neighborhood, Lot, Character]), BankModule, forwardRef(() => EventsModule)],
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsService],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
