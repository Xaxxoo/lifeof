import { Controller, Post, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { TransitService } from "./transit.service";

@Controller("transit")
@UseGuards(JwtAuthGuard)
export class TransitController {
  constructor(private transit: TransitService) {}

  @Post("tip")
  tip(@Req() req: { user: { token: string } }) {
    return this.transit.tip(req.user.token);
  }
}
