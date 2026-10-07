import { Controller, Get, Post, Body, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { GigsService } from "./gigs.service";

@Controller("gigs")
@UseGuards(JwtAuthGuard)
export class GigsController {
  constructor(private gigs: GigsService) {}

  @Get("offers")
  offers(@Req() req: { user: { token: string } }, @Query("window") window: string) {
    return this.gigs.offers(req.user.token, Number(window));
  }

  @Post("accept")
  accept(@Req() req: { user: { token: string } }, @Body() body: { offerId: string }) {
    return this.gigs.accept(req.user.token, body.offerId);
  }

  @Post("cancel")
  cancel(@Req() req: { user: { token: string } }) {
    return this.gigs.cancel(req.user.token);
  }
}
