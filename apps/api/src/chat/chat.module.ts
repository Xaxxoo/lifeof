import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { Character } from "../entities/character.entity";
import { Message } from "../entities/message.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Message])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
