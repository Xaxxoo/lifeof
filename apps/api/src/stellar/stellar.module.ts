import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StellarWallet } from "../entities/stellar-wallet.entity";
import { Character } from "../entities/character.entity";
import { BankModule } from "../bank/bank.module";
import { StellarService } from "./stellar.service";
import { StellarDepositService } from "./stellar-deposit.service";
import { StellarController } from "./stellar.controller";

@Module({
  imports: [TypeOrmModule.forFeature([StellarWallet, Character]), BankModule],
  controllers: [StellarController],
  providers: [StellarService, StellarDepositService],
  exports: [StellarService, StellarDepositService],
})
export class StellarModule {}
