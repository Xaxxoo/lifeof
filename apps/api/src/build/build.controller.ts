import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { BuildService } from "./build.service";

@Controller("build")
@UseGuards(JwtAuthGuard)
export class BuildController {
  constructor(private build: BuildService) {}

  @Post("buy")
  buy(
    @Req() req: { user: { token: string } },
    @Body() body: { itemId: string; x: number; y: number; rot: number; requestId: string },
  ) {
    return this.build.place(req.user.token, body.itemId, body.x, body.y, body.rot, body.requestId);
  }

  @Post("sell")
  sell(@Req() req: { user: { token: string } }, @Body() body: { objectId: string }) {
    return this.build.sell(req.user.token, body.objectId);
  }

  @Post("place")
  place(
    @Req() req: { user: { token: string } },
    @Body() body: { itemId: string; x: number; y: number; rot: number; requestId: string },
  ) {
    return this.build.place(req.user.token, body.itemId, body.x, body.y, body.rot, body.requestId);
  }

  @Post("move")
  move(
    @Req() req: { user: { token: string } },
    @Body() body: { objectId: string; x: number; y: number; rot: number },
  ) {
    return this.build.move(req.user.token, body.objectId, body.x, body.y, body.rot);
  }
}
