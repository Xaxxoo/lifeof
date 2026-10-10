import type { RelationshipLevel } from "@nyl/content";
import { RELATIONSHIP_THRESHOLDS, RELATIONSHIP_LEVELS } from "@nyl/content";
import { skillLevel } from "./skills";

/** Success chance for a social interaction, influenced by charisma, relationship, and mood. */
export function interactionSuccessChance(
  baseChance: number,
  charismaXp: number,
  relLevel: RelationshipLevel,
  actorMood: number,
): number {
  const charismaBonus = (skillLevel(charismaXp) - 1) * 0.03;
  const levelIndex = RELATIONSHIP_LEVELS.indexOf(relLevel);
  const relBonus = levelIndex * 0.04;
  const moodBonus = (actorMood - 50) * 0.002;
  return Math.max(0.05, Math.min(0.98, baseChance + charismaBonus + relBonus + moodBonus));
}

/** Determine the relationship level from accumulated points. */
export function levelFromPoints(points: number): RelationshipLevel {
  let result: RelationshipLevel = "stranger";
  for (const level of RELATIONSHIP_LEVELS) {
    if (points >= RELATIONSHIP_THRESHOLDS[level]) result = level;
  }
  return result;
}

/** Relationship points decay over time without interaction. 1 point per 6 hours of inactivity, floored at 0. */
export function relationshipDecay(points: number, hoursSinceLastInteraction: number): number {
  if (hoursSinceLastInteraction <= 24) return points;
  const decayHours = hoursSinceLastInteraction - 24;
  const decay = Math.floor(decayHours / 6);
  return Math.max(0, points - decay);
}
