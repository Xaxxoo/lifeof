/** Careers (PRD §6.4). M1 ships Food; the other four follow the same shape. */
export interface CareerLevel {
  title: string;
  payPerShift: number;
  /** Requirements to be promoted INTO this level. */
  cookingLevel: number;
  shiftsAtPrevLevel: number;
}

export interface CareerDef {
  id: string;
  name: string;
  employer: string;
  /** Shifts can start between these NYC hours. */
  hours: { open: number; close: number };
  levels: CareerLevel[];
  /** Need drain over a full shift. */
  shiftNeeds: { hunger: number; energy: number; hygiene: number; fun: number };
  skill: "cooking";
  skillXpPerShift: number;
  studentFriendly: boolean;
}

export const FOOD_CAREER: CareerDef = {
  id: "food",
  name: "Food",
  employer: "Grandma Rosa's Kitchen, Williamsburg",
  hours: { open: 6, close: 22 },
  levels: [
    { title: "Dishwasher", payPerShift: 110, cookingLevel: 1, shiftsAtPrevLevel: 0 },
    { title: "Prep Cook", payPerShift: 170, cookingLevel: 2, shiftsAtPrevLevel: 3 },
    { title: "Line Cook", payPerShift: 250, cookingLevel: 4, shiftsAtPrevLevel: 4 },
    { title: "Sous Chef", payPerShift: 380, cookingLevel: 6, shiftsAtPrevLevel: 5 },
    { title: "Head Chef", payPerShift: 520, cookingLevel: 8, shiftsAtPrevLevel: 6 },
  ],
  shiftNeeds: { hunger: -30, energy: -35, hygiene: -25, fun: -10 },
  skill: "cooking",
  skillXpPerShift: 30,
  studentFriendly: true,
};

export const CAREERS: Record<string, CareerDef> = { food: FOOD_CAREER };

/** Real minutes per shift; a short shift counts as a full 8-hour day. */
export const SHIFT_MINUTES = 5;
/** Student visa: campus jobs only, max 4 shifts a week (PRD §6.3). */
export const STUDENT_SHIFTS_PER_WEEK = 4;
/** Autopilot shifts while offline pay this share (PRD §5). */
export const AUTOPILOT_PAY_RATE = 0.6;
