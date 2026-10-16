import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ModeratorKeyGuard } from "./moderator.guard";
import { ModerationService, type ReportResolution } from "./moderation.service";

const RESOLUTIONS: ReportResolution[] = ["dismiss", "hide", "mute", "ban"];

/** Moderator queue and sanctions. Headers: x-moderator-key, x-moderator. */
@Controller("moderation")
@UseGuards(ModeratorKeyGuard)
@SkipThrottle()
export class ModerationController {
  constructor(private moderation: ModerationService) {}

  @Get("reports")
  reports(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.moderation.listReports(status ?? "pending", limit ? Number(limit) || 50 : 50);
  }

  /** action: dismiss | hide (hide the reported message) | mute (needs minutes) | ban (minutes optional = permanent). */
  @Post("reports/:id/resolve")
  resolve(
    @Headers("x-moderator") moderator: string,
    @Param("id") id: string,
    @Body() body: { action: ReportResolution; minutes?: number; note?: string },
  ) {
    if (!RESOLUTIONS.includes(body.action)) throw new BadRequestException(`action must be one of ${RESOLUTIONS.join(", ")}`);
    return this.moderation.resolveReport(id, body.action, moderator.trim(), { minutes: body.minutes, note: body.note });
  }

  @Get("characters/:id")
  history(@Param("id") id: string) {
    return this.moderation.history(id);
  }

  @Post("characters/:id/mute")
  mute(@Headers("x-moderator") moderator: string, @Param("id") id: string, @Body() body: { minutes: number; reason: string }) {
    return this.moderation.mute(id, body.minutes, requireReason(body.reason), moderator.trim());
  }

  @Post("characters/:id/unmute")
  unmute(@Headers("x-moderator") moderator: string, @Param("id") id: string, @Body() body: { reason?: string }) {
    return this.moderation.unmute(id, body?.reason, moderator.trim());
  }

  @Post("characters/:id/ban")
  ban(@Headers("x-moderator") moderator: string, @Param("id") id: string, @Body() body: { minutes?: number; reason: string }) {
    return this.moderation.ban(id, body.minutes, requireReason(body.reason), moderator.trim());
  }

  @Post("characters/:id/unban")
  unban(@Headers("x-moderator") moderator: string, @Param("id") id: string, @Body() body: { reason?: string }) {
    return this.moderation.unban(id, body?.reason, moderator.trim());
  }

  @Post("messages/:id/hide")
  hide(@Headers("x-moderator") moderator: string, @Param("id") id: string, @Body() body: { reason?: string }) {
    return this.moderation.hideMessage(id, moderator.trim(), body?.reason);
  }
}

function requireReason(reason: unknown): string {
  if (typeof reason !== "string" || !reason.trim()) throw new BadRequestException("reason is required");
  return reason.trim().slice(0, 500);
}
