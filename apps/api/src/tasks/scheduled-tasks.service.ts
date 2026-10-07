import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CityService } from "../city/city.service";
import { WorldService } from "../world/world.service";
import { BankService } from "../bank/bank.service";
import { WorkService } from "../work/work.service";

@Injectable()
export class ScheduledTasksService {
  constructor(
    private city: CityService,
    private world: WorldService,
    private bank: BankService,
    private work: WorkService,
  ) {}

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

  @Cron("0 * * * *")
  async everyHour() {
    await Promise.allSettled([this.bank.collectRent(), this.city.heatCheck()]);
  }
}
