import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";
import * as bcrypt from "bcryptjs";
import { Character } from "../entities/character.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(User) private users: Repository<User>,
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
  signForCharacter(characterId: string, token: string, userId?: string): string {
    return this.jwt.sign({ sub: characterId, token, ...(userId ? { userId } : {}) });
  }

  async signup(email: string, password: string): Promise<{ jwt: string; userId: string }> {
    email = email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Invalid email address");
    }
    if (!password || password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new BadRequestException("Email already in use");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.users.create({ email, passwordHash });
    const saved = await this.users.save(user);

    const token = uuid() + uuid();
    const jwt = this.jwt.sign({ sub: saved.id, token, userId: saved.id });
    return { jwt, userId: saved.id };
  }

  async login(email: string, password: string): Promise<{ jwt: string; userId: string; characterId: string | null }> {
    email = email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password");

    const character = await this.characters.findOne({ where: { userId: user.id } });

    if (character) {
      const jwt = this.jwt.sign({ sub: character.id, token: character.token, userId: user.id });
      return { jwt, userId: user.id, characterId: character.id };
    }

    const token = uuid() + uuid();
    const jwt = this.jwt.sign({ sub: user.id, token, userId: user.id });
    return { jwt, userId: user.id, characterId: null };
  }

  async sessionInfo(userId?: string, token?: string): Promise<{
    userId?: string;
    email?: string;
    characterId?: string;
    hasCharacter: boolean;
  }> {
    let user: User | null = null;
    if (userId) {
      user = await this.users.findOne({ where: { id: userId } });
    }

    let character: Character | null = null;
    if (userId) {
      character = await this.characters.findOne({ where: { userId } });
    }
    if (!character && token) {
      character = await this.characters.findOne({ where: { token } });
    }

    return {
      userId: user?.id,
      email: user?.email,
      characterId: character?.id,
      hasCharacter: !!character,
    };
  }
}
