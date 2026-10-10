import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { StoriesService } from "./stories.service";

@Controller("stories")
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private stories: StoriesService) {}

  @Get("available")
  available(@Req() req: { user: { characterId: string } }) {
    return this.stories.availableChapters(req.user.characterId);
  }

  @Post("start")
  start(
    @Req() req: { user: { token: string } },
    @Body() body: { chapterId: string },
  ) {
    return this.stories.startChapter(req.user.token, body.chapterId);
  }

  @Post("complete")
  complete(
    @Req() req: { user: { token: string } },
    @Body() body: { chapterId: string },
  ) {
    return this.stories.completeChapter(req.user.token, body.chapterId);
  }
}
