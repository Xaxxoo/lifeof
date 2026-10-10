import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { Character } from "../entities/character.entity";
import { Message } from "../entities/message.entity";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Message]), ModerationModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
