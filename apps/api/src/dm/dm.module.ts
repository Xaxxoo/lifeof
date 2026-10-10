import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DmController } from "./dm.controller";
import { DmService } from "./dm.service";
import { Character } from "../entities/character.entity";
import { DirectMessage } from "../entities/direct-message.entity";
import { SocialModule } from "../social/social.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, DirectMessage]),
    SocialModule,
    ModerationModule,
  ],
  controllers: [DmController],
  providers: [DmService],
  exports: [DmService],
})
export class DmModule {}
