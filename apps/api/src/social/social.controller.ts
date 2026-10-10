import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { SocialService } from "./social.service";

@Controller("social")
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private social: SocialService) {}

  @Post("interact")
  interact(
    @Req() req: { user: { token: string } },
    @Body() body: { targetId: string; interactionId: string },
  ) {
    return this.social.interact(req.user.token, body.targetId, body.interactionId);
  }

  @Get("friends")
  friends(@Req() req: { user: { characterId: string } }) {
    return this.social.friends(req.user.characterId);
  }

  @Get("relationship/:targetId")
  relationship(
    @Req() req: { user: { characterId: string } },
    @Param("targetId") targetId: string,
  ) {
    return this.social.relationship(req.user.characterId, targetId);
  }

  @Post("block")
  block(
    @Req() req: { user: { token: string } },
    @Body() body: { targetId: string },
  ) {
    return this.social.block(req.user.token, body.targetId);
  }

  @Post("unblock")
  unblock(
    @Req() req: { user: { token: string } },
    @Body() body: { targetId: string },
  ) {
    return this.social.unblock(req.user.token, body.targetId);
  }

  @Post("report")
  report(
    @Req() req: { user: { token: string } },
    @Body() body: { targetId: string; reason: string; detail?: string; messageId?: string },
  ) {
    return this.social.report(req.user.token, body.targetId, body.reason, body.detail, body.messageId);
  }

  @Get("blocked")
  blocked(@Req() req: { user: { characterId: string } }) {
    return this.social.blockedList(req.user.characterId);
  }
}
