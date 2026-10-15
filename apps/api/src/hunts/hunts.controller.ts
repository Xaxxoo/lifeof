import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from "@nestjs/common";
import type { HuntDef } from "@nyl/content";
import { JwtAuthGuard } from "../auth/auth.guard";
import { AdminKeyGuard } from "./admin.guard";
import { HuntsService } from "./hunts.service";

@Controller("hunts")
export class HuntsController {
  constructor(private hunts: HuntsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: { user: { characterId: string } }) {
    return this.hunts.list(req.user.characterId);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  join(@Req() req: { user: { characterId: string } }, @Param("id") id: string) {
    return this.hunts.join(req.user.characterId, id);
  }

  // ── Admin: launch and run partner campaigns ──

  @Put("admin/campaigns")
  @UseGuards(AdminKeyGuard)
  upsert(@Body() body: HuntDef) {
    return this.hunts.upsertCampaign(body);
  }

  @Post("admin/campaigns/:id/active")
  @UseGuards(AdminKeyGuard)
  setActive(@Param("id") id: string, @Body() body: { active: boolean }) {
    return this.hunts.setActive(id, !!body.active);
  }

  @Get("admin/campaigns/:id/report")
  @UseGuards(AdminKeyGuard)
  report(@Param("id") id: string) {
    return this.hunts.report(id);
  }
}
