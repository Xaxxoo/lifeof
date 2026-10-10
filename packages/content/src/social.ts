export type RelationshipLevel = "stranger" | "acquaintance" | "friend" | "close" | "day-one";
export type RomanticStatus = "crush" | "dating" | "partner" | null;

export const RELATIONSHIP_LEVELS: readonly RelationshipLevel[] = ["stranger", "acquaintance", "friend", "close", "day-one"];

export const RELATIONSHIP_THRESHOLDS: Record<RelationshipLevel, number> = {
  stranger: 0,
  acquaintance: 20,
  friend: 80,
  close: 200,
  "day-one": 500,
};

export interface SocialInteractionDef {
  id: string;
  label: string;
  rpGain: number;
  baseChance: number;
  minLevel: RelationshipLevel;
  cooldownMs: number;
  cost?: number;
  needsDelta?: Partial<Record<string, number>>;
  moodlet?: { id: string; label: string; value: number; hours: number };
  romantic?: boolean;
}

export const SOCIAL_INTERACTIONS: Record<string, SocialInteractionDef> = {
  chat_player: {
    id: "chat_player",
    label: "Chat",
    rpGain: 5,
    baseChance: 0.9,
    minLevel: "stranger",
    cooldownMs: 30_000,
    needsDelta: { social: 8 },
  },
  joke: {
    id: "joke",
    label: "Tell a joke",
    rpGain: 10,
    baseChance: 0.6,
    minLevel: "stranger",
    cooldownMs: 60_000,
    moodlet: { id: "still-laughing", label: "Still laughing", value: 5, hours: 1 },
  },
  compliment: {
    id: "compliment",
    label: "Compliment",
    rpGain: 8,
    baseChance: 0.75,
    minLevel: "stranger",
    cooldownMs: 60_000,
  },
  vent: {
    id: "vent",
    label: "Vent",
    rpGain: 12,
    baseChance: 0.65,
    minLevel: "acquaintance",
    cooldownMs: 120_000,
    moodlet: { id: "got-it-off-chest", label: "Got it off my chest", value: 4, hours: 2 },
  },
  gift: {
    id: "gift",
    label: "Give a gift",
    rpGain: 20,
    baseChance: 0.85,
    minLevel: "acquaintance",
    cooldownMs: 300_000,
    cost: 25,
  },
  ask_out: {
    id: "ask_out",
    label: "Ask out",
    rpGain: 30,
    baseChance: 0.4,
    minLevel: "friend",
    cooldownMs: 600_000,
    romantic: true,
  },
};

export const SOCIAL_INTERACTION_LIST = Object.values(SOCIAL_INTERACTIONS);

export const REPORT_REASONS = ["harassment", "spam", "inappropriate", "cheating", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
