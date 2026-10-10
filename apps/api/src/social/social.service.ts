import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SOCIAL_INTERACTIONS,
  RELATIONSHIP_LEVELS,
  REPORT_REASONS,
} from "@nyl/content";
import {
  interactionSuccessChance,
  levelFromPoints,
  relationshipDecay,
  computeMood,
  upsertMoodlet,
} from "@nyl/game-core";
import { Character } from "../entities/character.entity";
import { Relationship } from "../entities/relationship.entity";
import { Block } from "../entities/block.entity";
import { Report } from "../entities/report.entity";
import { BankService } from "../bank/bank.service";

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Relationship) private relationships: Repository<Relationship>,
    @InjectRepository(Block) private blocks: Repository<Block>,
    @InjectRepository(Report) private reports: Repository<Report>,
    private bank: BankService,
  ) {}

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  /** Get or create a bidirectional relationship pair. */
  async getRelationship(aId: string, bId: string): Promise<Relationship> {
    let rel = await this.relationships.findOne({
      where: { characterId: aId, targetId: bId },
    });
    if (!rel) {
      const now = Date.now();
      rel = await this.relationships.save({
        characterId: aId,
        targetId: bId,
        level: "stranger",
        points: 0,
        romantic: null,
        lastInteractionAt: now,
      });
      // Create the reverse side too
      const reverse = await this.relationships.findOne({
        where: { characterId: bId, targetId: aId },
      });
      if (!reverse) {
        await this.relationships.save({
          characterId: bId,
          targetId: aId,
          level: "stranger",
          points: 0,
          romantic: null,
          lastInteractionAt: now,
        });
      }
    }
    return rel;
  }

  async interact(
    token: string,
    targetId: string,
    interactionId: string,
  ): Promise<{
    success: boolean;
    rpGain: number;
    newLevel: string;
    moodlet?: { id: string; label: string; value: number };
  }> {
    const actor = await this.requireByToken(token);
    if (actor.id === targetId) throw new BadRequestException("Can't interact with yourself");

    const target = await this.characters.findOneBy({ id: targetId });
    if (!target) throw new BadRequestException("Player not found");

    const blocked = await this.isBlocked(actor.id, targetId);
    if (blocked) throw new BadRequestException("Cannot interact with this player");

    const def = SOCIAL_INTERACTIONS[interactionId];
    if (!def) throw new BadRequestException("Unknown interaction");

    // Get/create both sides of the relationship
    const rel = await this.getRelationship(actor.id, targetId);

    // Apply decay
    const hoursSince = (Date.now() - Number(rel.lastInteractionAt)) / 3_600_000;
    const decayedPoints = relationshipDecay(rel.points, hoursSince);
    const currentLevel = levelFromPoints(decayedPoints);

    // Check minimum level
    const levelIdx = RELATIONSHIP_LEVELS.indexOf(currentLevel);
    const requiredIdx = RELATIONSHIP_LEVELS.indexOf(def.minLevel);
    if (levelIdx < requiredIdx) {
      throw new BadRequestException(`Need to be at least ${def.minLevel} to do this`);
    }

    // Check cooldown
    const timeSince = Date.now() - Number(rel.lastInteractionAt);
    if (timeSince < def.cooldownMs) {
      throw new BadRequestException("Too soon, try again later");
    }

    // Check cost
    if (def.cost) {
      await this.bank.addMoney(actor.id, -def.cost, "social:gift", `social:${actor.id}:${targetId}:${Date.now()}`, {
        label: `Gift for ${target.name}`,
      });
    }

    // Roll for success
    const mood = computeMood(actor.needs, actor.moodlets, Date.now());
    const chance = interactionSuccessChance(def.baseChance, actor.skills.charisma, currentLevel, mood);
    const success = Math.random() < chance;

    const rpGain = success ? def.rpGain : Math.floor(def.rpGain * 0.3);
    const newPoints = decayedPoints + rpGain;
    const newLevel = levelFromPoints(newPoints);
    const now = Date.now();

    // Update both sides
    await this.relationships.update(
      { characterId: actor.id, targetId },
      { points: newPoints, level: newLevel, lastInteractionAt: now },
    );
    await this.relationships.update(
      { characterId: targetId, targetId: actor.id },
      { points: newPoints, level: newLevel, lastInteractionAt: now },
    );

    // Apply needs delta
    if (def.needsDelta) {
      const needs = { ...actor.needs };
      for (const [k, v] of Object.entries(def.needsDelta)) {
        if (k in needs) (needs as Record<string, number>)[k] = Math.max(0, Math.min(100, (needs as Record<string, number>)[k]! + v!));
      }
      await this.characters.update(actor.id, { needs });
    }

    // Apply moodlet
    let moodletResult: { id: string; label: string; value: number } | undefined;
    if (success && def.moodlet) {
      const m = {
        id: def.moodlet.id,
        label: def.moodlet.label,
        value: def.moodlet.value,
        expiresAt: now + def.moodlet.hours * 3_600_000,
      };
      await this.characters.update(actor.id, {
        moodlets: upsertMoodlet(actor.moodlets, m, now),
      });
      moodletResult = { id: m.id, label: m.label, value: m.value };
    }

    // Handle romantic
    if (success && def.romantic) {
      await this.relationships.update(
        { characterId: actor.id, targetId },
        { romantic: "crush" },
      );
      await this.relationships.update(
        { characterId: targetId, targetId: actor.id },
        { romantic: "crush" },
      );
    }

    return { success, rpGain, newLevel, moodlet: moodletResult };
  }

  async friends(characterId: string) {
    const rels = await this.relationships.find({
      where: { characterId },
    });

    const friendRels = rels.filter((r) => {
      const decayed = relationshipDecay(r.points, (Date.now() - Number(r.lastInteractionAt)) / 3_600_000);
      return levelFromPoints(decayed) !== "stranger";
    });

    const result = [];
    for (const rel of friendRels) {
      const target = await this.characters.findOneBy({ id: rel.targetId });
      if (!target) continue;
      const decayed = relationshipDecay(rel.points, (Date.now() - Number(rel.lastInteractionAt)) / 3_600_000);
      result.push({
        characterId: rel.targetId,
        name: target.name,
        look: target.look,
        level: levelFromPoints(decayed),
        romantic: rel.romantic,
        points: decayed,
      });
    }
    return result;
  }

  async relationship(characterId: string, targetId: string) {
    const rel = await this.getRelationship(characterId, targetId);
    const target = await this.characters.findOneBy({ id: targetId });
    const decayed = relationshipDecay(rel.points, (Date.now() - Number(rel.lastInteractionAt)) / 3_600_000);
    return {
      characterId: targetId,
      name: target?.name ?? "Unknown",
      look: target?.look,
      level: levelFromPoints(decayed),
      romantic: rel.romantic,
      points: decayed,
    };
  }

  async block(token: string, targetId: string) {
    const actor = await this.requireByToken(token);
    if (actor.id === targetId) throw new BadRequestException("Can't block yourself");

    const existing = await this.blocks.findOne({
      where: { blockerId: actor.id, blockedId: targetId },
    });
    if (existing) return;

    await this.blocks.save({ blockerId: actor.id, blockedId: targetId });
  }

  async unblock(token: string, targetId: string) {
    const actor = await this.requireByToken(token);
    await this.blocks.delete({ blockerId: actor.id, blockedId: targetId });
  }

  async report(
    token: string,
    targetId: string,
    reason: string,
    detail?: string,
    messageId?: string,
  ) {
    const actor = await this.requireByToken(token);
    if (actor.id === targetId) throw new BadRequestException("Can't report yourself");
    if (!REPORT_REASONS.includes(reason as any)) throw new BadRequestException("Invalid reason");

    await this.reports.save({
      reporterId: actor.id,
      targetId,
      reason,
      detail: detail ?? null,
      messageId: messageId ?? null,
    });
  }

  async isBlocked(aId: string, bId: string): Promise<boolean> {
    const block = await this.blocks.findOne({
      where: [
        { blockerId: aId, blockedId: bId },
        { blockerId: bId, blockedId: aId },
      ],
    });
    return !!block;
  }

  async blockedList(characterId: string) {
    const blocks = await this.blocks.find({ where: { blockerId: characterId } });
    const result = [];
    for (const b of blocks) {
      const target = await this.characters.findOneBy({ id: b.blockedId });
      if (target) result.push({ characterId: b.blockedId, name: target.name, look: target.look });
    }
    return result;
  }
}
