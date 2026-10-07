import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GigsController } from "./gigs.controller";
import { GigsService } from "./gigs.service";
import { Character } from "../entities/character.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [TypeOrmModule.forFeature([Character]), BankModule],
  controllers: [GigsController],
  providers: [GigsService],
  exports: [GigsService],
})
export class GigsModule {}
