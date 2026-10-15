import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";

/** Partner/ops endpoints: `x-admin-key` must match HUNT_ADMIN_KEY. Unset key = endpoints off. */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>("HUNT_ADMIN_KEY", "");
    const given = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers["x-admin-key"] ?? "";
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException();
    return true;
  }
}
