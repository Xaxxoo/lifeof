import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CityController } from "./city.controller";
import { CityService } from "./city.service";
import { CityState } from "../entities/city-state.entity";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CityState, Character, Presence])],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule {}
