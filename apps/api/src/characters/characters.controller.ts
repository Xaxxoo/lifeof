import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { AuthService } from "../auth/auth.service";
import { CharactersService } from "./characters.service";
import type { SessionUser } from "../auth/session.interface";

@Controller("characters")
export class CharactersController {
  constructor(
    private characters: CharactersService,
    private auth: AuthService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: SessionUser }) {
    return this.characters.me(req.user.token, req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: { user: SessionUser },
    @Body()
    body: {
      name: string;
      origin: string;
      status: string;
      trait: string;
      gender: string;
      sexuality: string;
      look: { skin: string; shirt: string; pants: string; hair: string; hairColor: string };
    },
  ) {
    const character = await this.characters.create({
      token: req.user.token,
      userId: req.user.userId,
      ...body,
    });
    const jwt = this.auth.signForCharacter(character.id, req.user.token, req.user.userId);
    return { character, jwt };
  }
}
