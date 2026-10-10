import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CrewsController } from "./crews.controller";
import { CrewsService } from "./crews.service";
import { Character } from "../entities/character.entity";
import { Crew } from "../entities/crew.entity";
import { CrewMember } from "../entities/crew-member.entity";
import { BankModule } from "../bank/bank.module";
import { SocialModule } from "../social/social.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, Crew, CrewMember]),
    BankModule,
    SocialModule,
  ],
  controllers: [CrewsController],
  providers: [CrewsService],
  exports: [CrewsService],
})
export class CrewsModule {}
