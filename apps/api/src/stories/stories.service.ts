import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { STORY_CHAPTERS, STORY_CHAPTER_BY_ID, RELATIONSHIP_LEVELS } from "@nyl/content";
import { levelFromPoints, relationshipDecay, upsertMoodlet } from "@nyl/game-core";
import { Character } from "../entities/character.entity";
import { Relationship } from "../entities/relationship.entity";
import { BankService } from "../bank/bank.service";

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Relationship) private relationships: Repository<Relationship>,
    private bank: BankService,
  ) {}

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  /** Get chapters the player has unlocked based on relationships with origin NPCs. */
  async availableChapters(characterId: string) {
    const c = await this.characters.findOneByOrFail({ id: characterId });
    const storyProgress = c.storyProgress ?? {};

    // Find relationships with NPCs that share the character's origin
    // For now, use the character's origin to determine available stories
    const origin = c.origin;
    const chapters = STORY_CHAPTERS.filter((ch) => ch.origin === origin);

    const available = [];
    for (const ch of chapters) {
      const prevChapter = ch.chapter - 1;
      const completedPrev = prevChapter === 0 || (storyProgress[ch.origin] ?? 0) >= prevChapter;
      if (!completedPrev) continue;

      // Check relationship level requirement
      // Use relationship with any NPC from the origin neighborhoods
      const rels = await this.relationships.find({ where: { characterId } });
      const bestLevel = this.getBestRelationshipLevel(rels);
      const requiredIdx = RELATIONSHIP_LEVELS.indexOf(ch.unlockLevel as any);
      const currentIdx = RELATIONSHIP_LEVELS.indexOf(bestLevel);

      if (currentIdx >= requiredIdx) {
        const alreadyCompleted = (storyProgress[ch.origin] ?? 0) >= ch.chapter;
        available.push({
          id: ch.id,
          title: ch.title,
          origin: ch.origin,
          chapter: ch.chapter,
          scenes: alreadyCompleted ? ch.scenes : [],
          reward: ch.reward,
          completed: alreadyCompleted,
          locked: false,
        });
      }
    }

    return available;
  }

  async startChapter(token: string, chapterId: string) {
    const c = await this.requireByToken(token);
    const chapter = STORY_CHAPTER_BY_ID[chapterId];
    if (!chapter) throw new BadRequestException("Unknown chapter");
    if (chapter.origin !== c.origin) throw new BadRequestException("Not your origin story");

    const storyProgress = c.storyProgress ?? {};
    const prevChapter = chapter.chapter - 1;
    if (prevChapter > 0 && (storyProgress[chapter.origin] ?? 0) < prevChapter) {
      throw new BadRequestException("Complete the previous chapter first");
    }

    return {
      id: chapter.id,
      title: chapter.title,
      origin: chapter.origin,
      chapter: chapter.chapter,
      scenes: chapter.scenes,
      reward: chapter.reward,
    };
  }

  async completeChapter(token: string, chapterId: string) {
    const c = await this.requireByToken(token);
    const chapter = STORY_CHAPTER_BY_ID[chapterId];
    if (!chapter) throw new BadRequestException("Unknown chapter");

    const storyProgress = c.storyProgress ?? {};
    if ((storyProgress[chapter.origin] ?? 0) >= chapter.chapter) {
      return { reward: null }; // Already completed
    }

    // Award reward
    if (chapter.reward.cash) {
      await this.bank.addMoney(
        c.id,
        chapter.reward.cash,
        "story:chapter",
        `story:${chapterId}:${c.id}`,
        { label: `Story: ${chapter.title}` },
      );
    }

    const now = Date.now();
    let moodlets = c.moodlets;
    if (chapter.reward.moodlet) {
      const m = {
        id: chapter.reward.moodlet.id,
        label: chapter.reward.moodlet.label,
        value: chapter.reward.moodlet.value,
        expiresAt: now + chapter.reward.moodlet.hours * 3_600_000,
      };
      moodlets = upsertMoodlet(moodlets, m, now);
    }

    // Update story progress
    const updatedProgress = { ...storyProgress, [chapter.origin]: chapter.chapter };
    await this.characters.update(c.id, {
      storyProgress: updatedProgress,
      moodlets,
    });

    return { reward: chapter.reward };
  }

  private getBestRelationshipLevel(rels: Relationship[]) {
    let best = "stranger";
    let bestIdx = 0;
    for (const rel of rels) {
      const decayed = relationshipDecay(rel.points, (Date.now() - Number(rel.lastInteractionAt)) / 3_600_000);
      const level = levelFromPoints(decayed);
      const idx = RELATIONSHIP_LEVELS.indexOf(level);
      if (idx > bestIdx) {
        bestIdx = idx;
        best = level;
      }
    }
    return best as any;
  }
}
