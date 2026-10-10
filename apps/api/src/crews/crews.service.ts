import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CREW_GOAL_BY_ID, CREW_GOALS, MAX_CREW_SIZE } from "@nyl/content";
import { rentPeriodKey } from "@nyl/game-core";
import { Character } from "../entities/character.entity";
import { Crew } from "../entities/crew.entity";
import { CrewMember } from "../entities/crew-member.entity";
import { BankService } from "../bank/bank.service";
import { SocialService } from "../social/social.service";

@Injectable()
export class CrewsService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Crew) private crews: Repository<Crew>,
    @InjectRepository(CrewMember) private members: Repository<CrewMember>,
    private bank: BankService,
    private social: SocialService,
  ) {}

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  async create(token: string, name: string) {
    const c = await this.requireByToken(token);
    const crewName = name.trim().slice(0, 24);
    if (crewName.length < 2) throw new BadRequestException("Crew name must be at least 2 characters");

    // Check if already in a crew
    const existing = await this.members.findOne({ where: { characterId: c.id } });
    if (existing) throw new BadRequestException("You're already in a crew");

    const crew = await this.crews.save({
      name: crewName,
      leaderId: c.id,
      weeklyGoal: null,
    });

    await this.members.save({
      crewId: crew.id,
      characterId: c.id,
      role: "leader",
      joinedAt: Date.now(),
    });

    return this.formatCrew(crew);
  }

  async invite(token: string, targetId: string) {
    const c = await this.requireByToken(token);
    const membership = await this.members.findOne({ where: { characterId: c.id } });
    if (!membership) throw new BadRequestException("You're not in a crew");

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (!crew) throw new BadRequestException("Crew not found");
    if (crew.leaderId !== c.id) throw new BadRequestException("Only the leader can invite");

    // Check friendship
    const friends = await this.social.friends(c.id);
    if (!friends.some((f) => f.characterId === targetId)) {
      throw new BadRequestException("You can only invite friends");
    }

    // Check if target is already in a crew
    const targetMembership = await this.members.findOne({ where: { characterId: targetId } });
    if (targetMembership) throw new BadRequestException("That player is already in a crew");

    // Check crew size
    const count = await this.members.count({ where: { crewId: crew.id } });
    if (count >= MAX_CREW_SIZE) throw new BadRequestException("Crew is full");

    await this.members.save({
      crewId: crew.id,
      characterId: targetId,
      role: "member",
      joinedAt: Date.now(),
    });
  }

  async join(token: string, crewId: string) {
    const c = await this.requireByToken(token);
    const existing = await this.members.findOne({ where: { characterId: c.id } });
    if (existing) throw new BadRequestException("You're already in a crew");

    const crew = await this.crews.findOneBy({ id: crewId });
    if (!crew) throw new BadRequestException("Crew not found");

    const count = await this.members.count({ where: { crewId } });
    if (count >= MAX_CREW_SIZE) throw new BadRequestException("Crew is full");

    await this.members.save({
      crewId,
      characterId: c.id,
      role: "member",
      joinedAt: Date.now(),
    });
  }

  async leave(token: string) {
    const c = await this.requireByToken(token);
    const membership = await this.members.findOne({ where: { characterId: c.id } });
    if (!membership) throw new BadRequestException("You're not in a crew");

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (crew && crew.leaderId === c.id) {
      // Transfer leadership or disband
      const otherMembers = await this.members.find({ where: { crewId: crew.id } });
      const others = otherMembers.filter((m) => m.characterId !== c.id);
      if (others.length > 0) {
        const newLeader = others[0]!;
        await this.crews.update(crew.id, { leaderId: newLeader.characterId });
        await this.members.update(newLeader.id, { role: "leader" });
      } else {
        await this.crews.delete(crew.id);
      }
    }

    await this.members.delete({ characterId: c.id });
  }

  async kick(token: string, memberId: string) {
    const c = await this.requireByToken(token);
    const membership = await this.members.findOne({ where: { characterId: c.id } });
    if (!membership) throw new BadRequestException("You're not in a crew");

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (!crew || crew.leaderId !== c.id) throw new BadRequestException("Only the leader can kick");

    const target = await this.members.findOne({ where: { characterId: memberId, crewId: crew.id } });
    if (!target) throw new BadRequestException("Player not in your crew");
    if (target.characterId === c.id) throw new BadRequestException("Can't kick yourself");

    await this.members.delete(target.id);
  }

  async disband(token: string) {
    const c = await this.requireByToken(token);
    const membership = await this.members.findOne({ where: { characterId: c.id } });
    if (!membership) throw new BadRequestException("You're not in a crew");

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (!crew || crew.leaderId !== c.id) throw new BadRequestException("Only the leader can disband");

    await this.members.delete({ crewId: crew.id });
    await this.crews.delete(crew.id);
  }

  async myCrew(characterId: string) {
    const membership = await this.members.findOne({ where: { characterId } });
    if (!membership) return null;

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (!crew) return null;

    return this.formatCrew(crew);
  }

  async setGoal(token: string, goalId: string) {
    const c = await this.requireByToken(token);
    const membership = await this.members.findOne({ where: { characterId: c.id } });
    if (!membership) throw new BadRequestException("You're not in a crew");

    const crew = await this.crews.findOneBy({ id: membership.crewId });
    if (!crew || crew.leaderId !== c.id) throw new BadRequestException("Only the leader can set goals");

    const goalDef = CREW_GOAL_BY_ID[goalId];
    if (!goalDef) throw new BadRequestException("Unknown goal");

    await this.crews.update(crew.id, {
      weeklyGoal: {
        type: goalDef.name,
        target: goalDef.target,
        progress: 0,
        period: rentPeriodKey(Date.now()),
      },
    });
  }

  async progressGoal(crewId: string, metric: string, amount: number) {
    const crew = await this.crews.findOneBy({ id: crewId });
    if (!crew?.weeklyGoal) return;

    const goalDef = CREW_GOALS.find((g) => g.name === crew.weeklyGoal!.type);
    if (!goalDef || goalDef.metric !== metric) return;

    const newProgress = crew.weeklyGoal.progress + amount;
    await this.crews.update(crew.id, {
      weeklyGoal: { ...crew.weeklyGoal, progress: newProgress },
    });
  }

  async checkGoalCompletion() {
    const allCrews = await this.crews.find();
    for (const crew of allCrews) {
      if (!crew.weeklyGoal) continue;
      if (crew.weeklyGoal.progress < crew.weeklyGoal.target) continue;

      const goalDef = CREW_GOALS.find((g) => g.name === crew.weeklyGoal!.type);
      if (!goalDef) continue;

      const crewMembers = await this.members.find({ where: { crewId: crew.id } });
      for (const member of crewMembers) {
        await this.bank.addMoney(
          member.characterId,
          goalDef.rewardPerMember,
          "crew:goal",
          `crew-goal:${crew.id}:${crew.weeklyGoal!.period}`,
          { label: `Crew goal: ${goalDef.name}` },
        );
      }

      // Reset goal
      await this.crews.update(crew.id, { weeklyGoal: null });
    }
  }

  /** Get crew membership for a character (used by other services). */
  async membershipFor(characterId: string) {
    return this.members.findOne({ where: { characterId } });
  }

  private async formatCrew(crew: Crew) {
    const crewMembers = await this.members.find({ where: { crewId: crew.id } });
    const memberDocs = [];
    for (const m of crewMembers) {
      const c = await this.characters.findOneBy({ id: m.characterId });
      if (c) memberDocs.push({ characterId: m.characterId, name: c.name, look: c.look, role: m.role });
    }
    return {
      id: crew.id,
      name: crew.name,
      leaderId: crew.leaderId,
      weeklyGoal: crew.weeklyGoal,
      members: memberDocs,
    };
  }
}
