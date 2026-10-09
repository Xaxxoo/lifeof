import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CityService } from "../city/city.service";
import { WorldService } from "../world/world.service";
import { BankService } from "../bank/bank.service";
import { WorkService } from "../work/work.service";
import { StellarDepositService } from "../stellar/stellar-deposit.service";
import { PlayService } from "../play/play.service";

@Injectable()
export class ScheduledTasksService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private city: CityService,
    private world: WorldService,
    private bank: BankService,
    private work: WorkService,
    private stellarDeposits: StellarDepositService,
    private play: PlayService,
  ) {}

  async onModuleInit() {
    this.logger.log("Startup sweep: checking for stuck activities…");
    const [boards, expired] = await Promise.allSettled([
      this.play.sweepPendingBoards(),
      this.play.sweepExpiredActivities(),
    ]);
    this.logger.log(
      `Startup sweep done — boards: ${boards.status === "fulfilled" ? boards.value : "error"}, expired: ${expired.status === "fulfilled" ? expired.value : "error"}`,
    );
  }

  @Cron("*/1 * * * *")
  async everyMinute() {
    await Promise.allSettled([this.city.pollSubway(), this.world.cleanupPresence()]);
  }

  @Cron("*/10 * * * *")
  async every10Minutes() {
    await this.city.pollWeather();
  }

  @Cron("*/15 * * * *")
  async every15Minutes() {
    await Promise.allSettled([this.city.poll311(), this.work.autopilotTick()]);
  }

  @Cron("*/2 * * * *")
  async every2Minutes() {
    await this.stellarDeposits.pollDeposits();
  }

  @Cron("0 * * * *")
  async everyHour() {
    await Promise.allSettled([this.bank.collectRent(), this.city.heatCheck()]);
  }

  @Cron("*/10 * * * * *")
  async sweepActivities() {
    await Promise.allSettled([this.play.sweepPendingBoards(), this.play.sweepExpiredActivities()]);
  }
}
