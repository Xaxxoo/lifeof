import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { WorldService } from "./world.service";

@Controller("world")
export class WorldController {
  constructor(private world: WorldService) {}

  @Post("join")
  @UseGuards(JwtAuthGuard)
  join(@Req() req: { user: { token: string } }) {
    return this.world.join(req.user.token);
  }

  @Post("move")
  @UseGuards(JwtAuthGuard)
  move(@Req() req: { user: { token: string } }, @Body() body: { target: { x: number; y: number } }) {
    return this.world.move(req.user.token, body.target);
  }

  @Post("heartbeat")
  @UseGuards(JwtAuthGuard)
  heartbeat(@Req() req: { user: { token: string } }) {
    return this.world.heartbeat(req.user.token);
  }

  @Post("leave")
  @UseGuards(JwtAuthGuard)
  leave(@Req() req: { user: { token: string } }) {
    return this.world.leave(req.user.token);
  }

  @Get("occupants/:roomId")
  occupants(@Param("roomId") roomId: string) {
    return this.world.occupants(roomId);
  }

  @Get("objects/:roomId")
  objects(@Param("roomId") roomId: string) {
    return this.world.roomObjects(roomId);
  }

  @Get("where-am-i")
  @UseGuards(JwtAuthGuard)
  whereAmI(@Req() req: { user: { token: string } }) {
    return this.world.whereAmI(req.user.token);
  }
}
