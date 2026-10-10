import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { Character } from "../entities/character.entity";
import { Listing } from "../entities/listing.entity";
import { Application } from "../entities/application.entity";
import { Lease } from "../entities/lease.entity";
import { Home } from "../entities/home.entity";
import { BankModule } from "../bank/bank.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, Listing, Application, Lease, Home]),
    BankModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
