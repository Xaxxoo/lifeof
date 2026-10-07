import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransitController } from "./transit.controller";
import { TransitService } from "./transit.service";
import { Character } from "../entities/character.entity";
import { BankModule } from "../bank/bank.module";
import { WorldModule } from "../world/world.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character]), BankModule, WorldModule],
  controllers: [TransitController],
  providers: [TransitService],
  exports: [TransitService],
})
export class TransitModule {}
