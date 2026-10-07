import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BankController } from "./bank.controller";
import { BankService } from "./bank.service";
import { Character } from "../entities/character.entity";
import { LedgerEntry } from "../entities/ledger-entry.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Character, LedgerEntry])],
  controllers: [BankController],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule {}
