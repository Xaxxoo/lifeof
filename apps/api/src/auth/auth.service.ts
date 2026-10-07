import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";
import { Character } from "../entities/character.entity";

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @InjectRepository(Character) private characters: Repository<Character>,
  ) {}

  async guest(): Promise<{ token: string; jwt: string; characterId: string | null }> {
    const token = uuid() + uuid();
    const existing = await this.characters.findOne({ where: { token } });
    const characterId = existing?.id ?? null;
    const jwt = this.jwt.sign({
      sub: characterId ?? token,
      token,
    });
    return { token, jwt, characterId };
  }

  /** Sign a JWT for an existing character (used after character creation). */
  signForCharacter(characterId: string, token: string): string {
    return this.jwt.sign({ sub: characterId, token });
  }
}
