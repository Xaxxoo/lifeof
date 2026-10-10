import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { Character } from "../entities/character.entity";
import { Relationship } from "../entities/relationship.entity";
import { Block } from "../entities/block.entity";
import { Report } from "../entities/report.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character, Relationship, Block, Report]), BankModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
