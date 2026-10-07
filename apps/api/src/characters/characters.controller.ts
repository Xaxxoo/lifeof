import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { AuthService } from "../auth/auth.service";
import { CharactersService } from "./characters.service";

@Controller("characters")
export class CharactersController {
  constructor(
    private characters: CharactersService,
    private auth: AuthService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { token: string } }) {
    return this.characters.me(req.user.token);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: { user: { token: string } },
    @Body()
    body: {
      name: string;
      origin: string;
      status: string;
      trait: string;
      look: { skin: string; shirt: string; pants: string; hair: string; hairColor: string };
    },
  ) {
    const character = await this.characters.create({ token: req.user.token, ...body });
    const jwt = this.auth.signForCharacter(character.id, req.user.token);
    return { character, jwt };
  }
}
