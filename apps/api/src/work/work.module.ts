import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkController } from "./work.controller";
import { WorkService } from "./work.service";
import { Character } from "../entities/character.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character]), BankModule],
  controllers: [WorkController],
  providers: [WorkService],
  exports: [WorkService],
})
export class WorkModule {}
