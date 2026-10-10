import { Module } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { AuthModule } from "../auth/auth.module";
import { WorldModule } from "../world/world.module";
import { ChatModule } from "../chat/chat.module";
import { SocialModule } from "../social/social.module";
import { DmModule } from "../dm/dm.module";

@Module({
  imports: [AuthModule, WorldModule, ChatModule, SocialModule, DmModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
