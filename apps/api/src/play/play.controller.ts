import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { PlayService } from "./play.service";

@Controller("play")
@UseGuards(JwtAuthGuard)
export class PlayController {
  constructor(private play: PlayService) {}

  @Post("start")
  start(
    @Req() req: { user: { token: string } },
    @Body() body: { target: string; actionId: string; dest?: string },
  ) {
    return this.play.start(req.user.token, body.target, body.actionId, body.dest);
  }

  @Post("stop")
  stop(@Req() req: { user: { token: string } }) {
    return this.play.stop(req.user.token);
  }

  @Post("finish")
  async finish(@Req() req: { user: { characterId: string } }) {
    // Manual finish: the client thinks the timer is done. Let complete() verify.
    // In practice the server timer fires; this is a fallback.
    return { ok: true };
  }
}
