export interface CrewGoalDef {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  rewardPerMember: number;
}

export const CREW_GOALS: CrewGoalDef[] = [
  {
    id: "grind",
    name: "The Grind",
    description: "Earn $2,000 combined",
    metric: "cash_earned",
    target: 2000,
    rewardPerMember: 100,
  },
  {
    id: "link-up",
    name: "Link Up",
    description: "30 social interactions",
    metric: "social_interactions",
    target: 30,
    rewardPerMember: 75,
  },
  {
    id: "explore",
    name: "Explore BK",
    description: "Visit all 7 neighborhoods",
    metric: "rooms_visited",
    target: 7,
    rewardPerMember: 50,
  },
  {
    id: "workers",
    name: "Workers United",
    description: "Work 20 shifts",
    metric: "shifts_worked",
    target: 20,
    rewardPerMember: 80,
  },
];

export const CREW_GOAL_BY_ID: Record<string, CrewGoalDef> = Object.fromEntries(
  CREW_GOALS.map((g) => [g.id, g]),
);

export const MAX_CREW_SIZE = 8;
