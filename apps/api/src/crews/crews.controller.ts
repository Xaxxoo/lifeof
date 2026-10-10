import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { CrewsService } from "./crews.service";

@Controller("crews")
@UseGuards(JwtAuthGuard)
export class CrewsController {
  constructor(private crews: CrewsService) {}

  @Post()
  create(
    @Req() req: { user: { token: string } },
    @Body() body: { name: string },
  ) {
    return this.crews.create(req.user.token, body.name);
  }

  @Post("invite")
  invite(
    @Req() req: { user: { token: string } },
    @Body() body: { targetId: string },
  ) {
    return this.crews.invite(req.user.token, body.targetId);
  }

  @Post("join")
  join(
    @Req() req: { user: { token: string } },
    @Body() body: { crewId: string },
  ) {
    return this.crews.join(req.user.token, body.crewId);
  }

  @Post("leave")
  leave(@Req() req: { user: { token: string } }) {
    return this.crews.leave(req.user.token);
  }

  @Post("kick")
  kick(
    @Req() req: { user: { token: string } },
    @Body() body: { memberId: string },
  ) {
    return this.crews.kick(req.user.token, body.memberId);
  }

  @Post("disband")
  disband(@Req() req: { user: { token: string } }) {
    return this.crews.disband(req.user.token);
  }

  @Get("mine")
  mine(@Req() req: { user: { characterId: string } }) {
    return this.crews.myCrew(req.user.characterId);
  }

  @Post("goal")
  setGoal(
    @Req() req: { user: { token: string } },
    @Body() body: { goalId: string },
  ) {
    return this.crews.setGoal(req.user.token, body.goalId);
  }
}
