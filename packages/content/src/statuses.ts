/** Status is a rules layer, never a punishment (PRD §6.3). Cash is in whole dollars. */
export const STATUSES = [
  {
    id: "student",
    name: "Student visa",
    startingCash: 2400,
    workRules: "Campus jobs only, max 4 shifts a week",
  },
  {
    id: "work",
    name: "Work visa",
    startingCash: 3500,
    workRules: "Must hold a job with a sponsoring employer",
  },
  {
    id: "greencard",
    name: "Green card (lottery winner)",
    startingCash: 1800,
    workRules: "Any job, any gig",
  },
  {
    id: "citizen",
    name: "US citizen (moving from another state)",
    startingCash: 3400,
    workRules: "Any job, any gig",
  },
] as const;

export type StatusId = (typeof STATUSES)[number]["id"];
export const STATUS_IDS = STATUSES.map((s) => s.id) as [StatusId, ...StatusId[]];

export const ORIGIN_CASH_BONUS: Partial<Record<string, number>> = { ohio: 1000 };
