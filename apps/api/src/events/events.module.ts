import { Module } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { AuthModule } from "../auth/auth.module";
import { WorldModule } from "../world/world.module";
import { ChatModule } from "../chat/chat.module";

@Module({
  imports: [AuthModule, WorldModule, ChatModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
