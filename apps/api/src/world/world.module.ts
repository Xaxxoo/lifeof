import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorldController } from "./world.controller";
import { WorldService } from "./world.service";
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { PlacedObject } from "../entities/placed-object.entity";
import { CityState } from "../entities/city-state.entity";
import { Home } from "../entities/home.entity";
import { Relationship } from "../entities/relationship.entity";
import { CrewMember } from "../entities/crew-member.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Presence, PlacedObject, CityState, Home, Relationship, CrewMember])],
  controllers: [WorldController],
  providers: [WorldService],
  exports: [WorldService],
})
export class WorldModule {}
