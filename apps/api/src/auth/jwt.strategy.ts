import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ModerationService } from "../moderation/moderation.service";

export interface JwtPayload {
  sub: string;
  token: string;
  userId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private moderation: ModerationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "change-me-in-production"),
    });
  }

  async validate(payload: JwtPayload) {
    if (await this.moderation.isBanned(payload.sub)) throw new ForbiddenException("This account is banned");
    return { characterId: payload.sub, token: payload.token, userId: payload.userId };
  }
}
