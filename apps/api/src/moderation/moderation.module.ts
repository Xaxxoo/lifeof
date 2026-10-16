import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModerationService } from "./moderation.service";
import { ModerationController } from "./moderation.controller";
import { ModeratorKeyGuard } from "./moderator.guard";
import { Message } from "../entities/message.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { Character } from "../entities/character.entity";
import { Report } from "../entities/report.entity";
import { ModerationAction } from "../entities/moderation-action.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Message, DirectMessage, Character, Report, ModerationAction])],
  controllers: [ModerationController],
  providers: [ModerationService, ModeratorKeyGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
