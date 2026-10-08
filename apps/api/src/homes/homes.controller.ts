import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { HomesService, type BuildOp } from "./homes.service";

type Authed = { user: { token: string } };

@Controller("homes")
@UseGuards(JwtAuthGuard)
export class HomesController {
  constructor(private homes: HomesService) {}

  @Get("mine")
  mine(@Req() req: Authed) {
    return this.homes.mine(req.user.token);
  }

  @Get("layout/:homeId")
  layout(@Param("homeId") homeId: string) {
    return this.homes.layout(homeId);
  }

  @Post("rent")
  rent(@Req() req: Authed, @Body() body: { tierId: string }) {
    return this.homes.rent(req.user.token, body.tierId);
  }

  @Post("buy-lot")
  buyLot(@Req() req: Authed, @Body() body: { lotId: string }) {
    return this.homes.buyLot(req.user.token, body.lotId);
  }

  @Post("move-in")
  moveIn(@Req() req: Authed, @Body() body: { homeId: string }) {
    return this.homes.moveInto(req.user.token, body.homeId);
  }

  @Post("visit")
  visit(@Req() req: Authed, @Body() body: { homeId: string }) {
    return this.homes.visit(req.user.token, body.homeId);
  }

  @Post("paint")
  paint(@Req() req: Authed, @Body() body: { paintId: string }) {
    return this.homes.paint(req.user.token, body.paintId);
  }

  @Post("floor")
  floor(@Req() req: Authed, @Body() body: { floorId: string }) {
    return this.homes.floor(req.user.token, body.floorId);
  }

  @Post("unlock-floor")
  unlockFloor(@Req() req: Authed, @Body() body: { floorId: string }) {
    return this.homes.unlockFloor(req.user.token, body.floorId);
  }

  @Post("build")
  build(@Req() req: Authed, @Body() body: { ops: BuildOp[] }) {
    return this.homes.build(req.user.token, body.ops);
  }
}
