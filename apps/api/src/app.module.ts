import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { databaseConfig } from "./config/database.config";
import { AuthModule } from "./auth/auth.module";
import { CharactersModule } from "./characters/characters.module";
import { WorldModule } from "./world/world.module";
import { PlayModule } from "./play/play.module";
import { GigsModule } from "./gigs/gigs.module";
import { WorkModule } from "./work/work.module";
import { BankModule } from "./bank/bank.module";
import { BuildModule } from "./build/build.module";
import { CityModule } from "./city/city.module";
import { ChatModule } from "./chat/chat.module";
import { TransitModule } from "./transit/transit.module";
import { StellarModule } from "./stellar/stellar.module";
import { EventsModule } from "./events/events.module";
import { HomesModule } from "./homes/homes.module";
import { SocialModule } from "./social/social.module";
import { DmModule } from "./dm/dm.module";
import { ModerationModule } from "./moderation/moderation.module";
import { CrewsModule } from "./crews/crews.module";
import { ListingsModule } from "./listings/listings.module";
import { QuestsModule } from "./quests/quests.module";
import { StoriesModule } from "./stories/stories.module";
import { HuntsModule } from "./hunts/hunts.module";
import { NeighborhoodsModule } from "./neighborhoods/neighborhoods.module";
import { ScheduledTasksService } from "./tasks/scheduled-tasks.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      // The e2e tests sign up many players from one IP; never honoured in production.
      skipIf: () => process.env.DISABLE_THROTTLE === "1" && process.env.NODE_ENV !== "production",
    }),
    AuthModule,
    CharactersModule,
    WorldModule,
    PlayModule,
    GigsModule,
    WorkModule,
    BankModule,
    BuildModule,
    CityModule,
    ChatModule,
    TransitModule,
    StellarModule,
    EventsModule,
    HomesModule,
    SocialModule,
    DmModule,
    ModerationModule,
    CrewsModule,
    ListingsModule,
    QuestsModule,
    StoriesModule,
    HuntsModule,
    NeighborhoodsModule,
  ],
  providers: [
    ScheduledTasksService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
