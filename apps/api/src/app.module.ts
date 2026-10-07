import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
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
  ],
  providers: [ScheduledTasksService],
})
export class AppModule {}
