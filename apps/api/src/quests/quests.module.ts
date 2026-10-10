import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";
import { QuestProgress } from "../entities/quest-progress.entity";
import { Character } from "../entities/character.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [TypeOrmModule.forFeature([QuestProgress, Character]), BankModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
