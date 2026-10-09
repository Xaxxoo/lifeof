import { Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("guest")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async guest() {
    return this.auth.guest();
  }
}
