import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";
import { Character } from "../entities/character.entity";
import { Relationship } from "../entities/relationship.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Relationship]), BankModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
