import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { WorkService } from "./work.service";

@Controller("work")
@UseGuards(JwtAuthGuard)
export class WorkController {
  constructor(private work: WorkService) {}

  @Post("apply")
  apply(@Req() req: { user: { token: string } }, @Body() body: { careerId: string }) {
    return this.work.apply(req.user.token, body.careerId);
  }

  @Post("quit")
  quit(@Req() req: { user: { token: string } }) {
    return this.work.quit(req.user.token);
  }
}
