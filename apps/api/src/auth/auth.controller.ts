import { Controller, Post, Get, Body, UseGuards, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import type { SessionUser } from "./session.interface";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("guest")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async guest() {
    return this.auth.guest();
  }

  @Post("signup")
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async signup(@Body() body: { email: string; password: string }) {
    return this.auth.signup(body.email, body.password);
  }

  @Post("login")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: SessionUser }) {
    return this.auth.sessionInfo(req.user.userId, req.user.token);
  }
}
