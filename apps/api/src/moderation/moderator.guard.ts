import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";

/**
 * Moderator endpoints: `x-moderator-key` must match MODERATION_ADMIN_KEY (unset = endpoints off),
 * and `x-moderator` names who is acting, for the audit log.
 */
@Injectable()
export class ModeratorKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>("MODERATION_ADMIN_KEY", "");
    const headers = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers;
    const a = Buffer.from(expected);
    const b = Buffer.from(headers["x-moderator-key"] ?? "");
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException();
    const name = (headers["x-moderator"] ?? "").trim();
    if (!name || name.length > 64 || name === "system") throw new BadRequestException("x-moderator header is required");
    return true;
  }
}
