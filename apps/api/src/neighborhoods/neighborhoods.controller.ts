import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { PlayerShop } from "@nyl/content";
import { JwtAuthGuard } from "../auth/auth.guard";
import { NeighborhoodsService } from "./neighborhoods.service";

@Controller("neighborhoods")
export class NeighborhoodsController {
  constructor(private hoods: NeighborhoodsService) {}

  /** Public: the client needs the blocks to draw the world, before or without a session. */
  @Get()
  list() {
    return this.hoods.list();
  }

  @Post("found")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  found(@Req() req: { user: { token: string } }, @Body() body: { neighborhoodId: string; street: string }) {
    return this.hoods.found(req.user.token, body.neighborhoodId, body.street);
  }

  @Post(":id/lots/:index/buy")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  buy(@Req() req: { user: { token: string } }, @Param("id") id: string, @Param("index", ParseIntPipe) index: number) {
    return this.hoods.buyLot(req.user.token, id, index);
  }

  @Post(":id/lots/:index/build")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  build(
    @Req() req: { user: { token: string } },
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
    @Body() body: Partial<PlayerShop>,
  ) {
    return this.hoods.build(req.user.token, id, index, body);
  }
}
