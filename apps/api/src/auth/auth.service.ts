import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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
    const saved = await this.createUser(email, password);
    const token = uuid() + uuid();
    const jwt = this.jwt.sign({ sub: saved.id, token, userId: saved.id });
    return { jwt, userId: saved.id };
  }

  /**
   * Turn a guest session into an account, keeping its character (and everything on it).
   * The session token stays the same, so the character is still found by token.
   */
  async upgrade(session: { token: string; userId?: string }, email: string, password: string): Promise<{
    jwt: string;
    userId: string;
    characterId: string | null;
  }> {
    if (session.userId) throw new BadRequestException("This session already has an account");
    const character = await this.characters.findOne({ where: { token: session.token } });
    if (character?.userId) throw new BadRequestException("This character already belongs to an account");

    const saved = await this.createUser(email, password);
    if (character) {
      // Only claim a character nobody owns yet, so two upgrades at once can't both take it.
      const res = await this.characters.update({ id: character.id, userId: IsNull() }, { userId: saved.id });
      if (!res.affected) {
        await this.users.delete({ id: saved.id });
        throw new BadRequestException("This character already belongs to an account");
      }
    }

    const jwt = this.jwt.sign({ sub: character?.id ?? session.token, token: session.token, userId: saved.id });
    return { jwt, userId: saved.id, characterId: character?.id ?? null };
  }

  private async createUser(email: string, password: string): Promise<User> {
    email = (email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Invalid email address");
    }
    if (!password || password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new BadRequestException("Email already in use");

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      return await this.users.save(this.users.create({ email, passwordHash }));
    } catch (e) {
      // Two signups with the same email at once: the unique index catches the second.
      if ((e as { code?: string }).code === "23505") throw new BadRequestException("Email already in use");
      throw e;
    }
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
