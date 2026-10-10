import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ONBOARDING_QUEST } from "@nyl/content";
import { QuestProgress } from "../entities/quest-progress.entity";
import { Character } from "../entities/character.entity";
import { BankService } from "../bank/bank.service";

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(QuestProgress) private progress: Repository<QuestProgress>,
    @InjectRepository(Character) private characters: Repository<Character>,
    private bank: BankService,
  ) {}

  async initOnboarding(characterId: string) {
    const existing = await this.progress.findOne({ where: { characterId } });
    if (existing) return;

    await this.progress.save({
      characterId,
      questId: ONBOARDING_QUEST.id,
      step: 0,
      flags: {},
      completed: false,
      startedAt: Date.now(),
      completedAt: null,
    });
  }

  async getProgress(characterId: string) {
    const qp = await this.progress.findOne({ where: { characterId } });
    if (!qp) return null;
    return {
      questId: qp.questId,
      step: qp.step,
      completed: qp.completed,
      flags: qp.flags,
    };
  }

  /**
   * Check if a trigger advances the quest. Called by other services.
   * Returns true if a step was advanced.
   */
  async checkTrigger(
    characterId: string,
    trigger: string,
    value?: string | number,
  ): Promise<boolean> {
    const qp = await this.progress.findOne({ where: { characterId } });
    if (!qp || qp.completed) return false;

    const quest = ONBOARDING_QUEST;
    if (qp.step >= quest.steps.length) return false;

    const step = quest.steps[qp.step]!;
    if (step.trigger !== trigger) return false;

    // Check triggerValue if specified
    if (step.triggerValue !== undefined) {
      if (typeof step.triggerValue === "number") {
        if (typeof value !== "number" || value < step.triggerValue) return false;
      } else {
        // For food triggers, match common food action ids
        if (step.triggerValue === "food") {
          const foodActions = [
            "eat_leftovers", "cook", "bodega_bec", "halal", "patty", "roti",
            "waakye", "soulfood", "jollof", "snacks", "fruit", "pizza",
            "grill", "produce", "community_dinner", "pastry", "smoothie",
          ];
          if (typeof value !== "string" || !foodActions.includes(value)) return false;
        } else if (typeof value !== "string" || value !== step.triggerValue) {
          return false;
        }
      }
    }

    const newStep = qp.step + 1;
    const isComplete = newStep >= quest.steps.length;

    // Give step reward
    if (step.reward) {
      await this.bank.addMoney(
        characterId,
        step.reward,
        "quest:step",
        `quest:${qp.questId}:step:${qp.step}:${characterId}`,
        { label: `Quest: ${step.title}` },
      );
    }

    if (isComplete) {
      // Give completion reward
      await this.bank.addMoney(
        characterId,
        quest.completionReward,
        "quest:complete",
        `quest:${qp.questId}:complete:${characterId}`,
        { label: `Quest complete: ${quest.name}` },
      );

      await this.progress.update(qp.id, {
        step: newStep,
        completed: true,
        completedAt: Date.now(),
      });
    } else {
      await this.progress.update(qp.id, { step: newStep });
    }

    return true;
  }
}
