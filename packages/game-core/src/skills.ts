/** Six skills, levels 1–10, stored as XP (PRD §6.10). */
export const SKILL_KEYS = ["cooking", "charisma", "fitness", "coding", "creativity", "hustle"] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];
export type Skills = Record<SkillKey, number>;

/** XP needed to reach each level; index = level − 1. Level 10 is the cap. */
export const SKILL_XP_THRESHOLDS = [0, 60, 150, 300, 500, 760, 1100, 1550, 2100, 2800] as const;

export function emptySkills(): Skills {
  return { cooking: 0, charisma: 0, fitness: 0, coding: 0, creativity: 0, hustle: 0 };
}

export function skillLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < SKILL_XP_THRESHOLDS.length; i++) if (xp >= SKILL_XP_THRESHOLDS[i]!) level = i + 1;
  return level;
}

/** 0–1 progress toward the next level (1 at the cap). */
export function skillProgress(xp: number): number {
  const level = skillLevel(xp);
  if (level >= SKILL_XP_THRESHOLDS.length) return 1;
  const lo = SKILL_XP_THRESHOLDS[level - 1]!;
  const hi = SKILL_XP_THRESHOLDS[level]!;
  return (xp - lo) / (hi - lo);
}
