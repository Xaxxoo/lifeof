import { Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("guest")
  async guest() {
    return this.auth.guest();
  }
}
