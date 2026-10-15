import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Hunt } from "../entities/hunt.entity";
import { HuntProgress } from "../entities/hunt-progress.entity";
import { BankModule } from "../bank/bank.module";
import { StellarModule } from "../stellar/stellar.module";
import { EventsModule } from "../events/events.module";
import { HuntsController } from "./hunts.controller";
import { HuntsService } from "./hunts.service";
import { AdminKeyGuard } from "./admin.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Hunt, HuntProgress]), BankModule, StellarModule, forwardRef(() => EventsModule)],
  controllers: [HuntsController],
  providers: [HuntsService, AdminKeyGuard],
  exports: [HuntsService],
})
export class HuntsModule {}
