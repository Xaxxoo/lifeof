import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private quests: QuestsService) {}

  @Get("progress")
  progress(@Req() req: { user: { characterId: string } }) {
    return this.quests.getProgress(req.user.characterId);
  }
}
