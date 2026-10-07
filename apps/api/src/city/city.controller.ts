import { Controller, Get } from "@nestjs/common";
import { CityService } from "./city.service";

@Controller("city")
export class CityController {
  constructor(private city: CityService) {}

  @Get()
  get() {
    return this.city.get();
  }
}
