import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlayController } from "./play.controller";
import { PlayService } from "./play.service";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { WorldModule } from "../world/world.module";
import { BankModule } from "../bank/bank.module";
import { GigsModule } from "../gigs/gigs.module";
import { CityModule } from "../city/city.module";
import { EventsModule } from "../events/events.module";
import { QuestsModule } from "../quests/quests.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, Presence]),
    WorldModule,
    BankModule,
    forwardRef(() => GigsModule),
    CityModule,
    forwardRef(() => EventsModule),
    QuestsModule,
  ],
  controllers: [PlayController],
  providers: [PlayService],
  exports: [PlayService],
})
export class PlayModule {}
