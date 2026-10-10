import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModerationService } from "./moderation.service";
import { Message } from "../entities/message.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { Character } from "../entities/character.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Message, DirectMessage, Character])],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
