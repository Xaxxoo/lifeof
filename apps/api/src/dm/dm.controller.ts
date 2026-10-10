import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { DmService } from "./dm.service";

@Controller("dm")
@UseGuards(JwtAuthGuard)
export class DmController {
  constructor(private dm: DmService) {}

  @Post("send")
  send(
    @Req() req: { user: { token: string } },
    @Body() body: { recipientId: string; body: string },
  ) {
    return this.dm.send(req.user.token, body.recipientId, body.body);
  }

  @Get("threads")
  threads(@Req() req: { user: { characterId: string } }) {
    return this.dm.threads(req.user.characterId);
  }

  @Get("conversation/:partnerId")
  conversation(
    @Req() req: { user: { characterId: string } },
    @Param("partnerId") partnerId: string,
    @Query("before") before?: string,
  ) {
    return this.dm.conversation(req.user.characterId, partnerId, before);
  }

  @Post("read/:partnerId")
  markRead(
    @Req() req: { user: { characterId: string } },
    @Param("partnerId") partnerId: string,
  ) {
    return this.dm.markRead(req.user.characterId, partnerId);
  }

  @Get("unread-count")
  async unreadCount(@Req() req: { user: { characterId: string } }) {
    const count = await this.dm.unreadCount(req.user.characterId);
    return { count };
  }
}
