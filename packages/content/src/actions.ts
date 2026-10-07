import type { Needs, SkillKey } from "@nyl/game-core";

/**
 * Everything a player can do by tapping an object (PRD §5, §6). Durations are real time, already compressed.
 * `needs` are the totals for a full run; stopping early pays the share done.
 */
export type ActionKind = "use" | "travel" | "work";

export interface ActionDef {
  id: string;
  label: string;
  kind: ActionKind;
  durationMs: number;
  needs?: Partial<Needs>;
  cost?: number;
  skill?: { key: SkillKey; xp: number };
  moodlet?: { id: string; label: string; value: number; hours: number };
  /** Pose while doing it. */
  pose?: "stand" | "sit" | "sleep";
  /** Shown as a speech-bubble-style status above the avatar. */
  status: string;
}

const MIN = 60_000;

export const ACTIONS: Record<string, ActionDef> = {
  // Home
  sleep: { id: "sleep", label: "Sleep", kind: "use", durationMs: 10 * MIN, needs: { energy: 100 }, pose: "sleep", status: "Sleeping 💤",
    moodlet: { id: "rested", label: "Well rested", value: 8, hours: 4 } },
  nap: { id: "nap", label: "Nap", kind: "use", durationMs: 3 * MIN, needs: { energy: 30 }, pose: "sleep", status: "Napping 😴" },
  eat_leftovers: { id: "eat_leftovers", label: "Eat leftovers", kind: "use", durationMs: 1 * MIN, needs: { hunger: 35 }, cost: 4, pose: "stand", status: "Eating leftovers 🍱" },
  cook: { id: "cook", label: "Cook a meal", kind: "use", durationMs: 2 * MIN, needs: { hunger: 70, fun: 5 }, cost: 6, pose: "stand", status: "Cooking 🍳",
    skill: { key: "cooking", xp: 25 }, moodlet: { id: "home-cooked", label: "Home-cooked meal", value: 6, hours: 3 } },
  shower: { id: "shower", label: "Shower", kind: "use", durationMs: 1 * MIN, needs: { hygiene: 100 }, pose: "stand", status: "Showering 🚿" },
  toilet: { id: "toilet", label: "Use the toilet", kind: "use", durationMs: 20_000, needs: { bladder: 100 }, pose: "sit", status: "Busy 🚽" },
  watch_tv: { id: "watch_tv", label: "Watch TV", kind: "use", durationMs: 2 * MIN, needs: { fun: 40 }, pose: "sit", status: "Watching TV 📺" },
  lounge: { id: "lounge", label: "Lounge", kind: "use", durationMs: 1 * MIN, needs: { fun: 10, energy: 8 }, pose: "sit", status: "Lounging 🛋️" },
  practice_charisma: { id: "practice_charisma", label: "Practice a speech", kind: "use", durationMs: 1.5 * MIN, needs: { fun: 8 }, pose: "stand",
    status: "Practicing 🗣️", skill: { key: "charisma", xp: 20 } },
  study_coding: { id: "study_coding", label: "Learn to code", kind: "use", durationMs: 2 * MIN, needs: { fun: 5, energy: -8 }, pose: "sit",
    status: "Coding 💻", skill: { key: "coding", xp: 25 } },
  play_guitar: { id: "play_guitar", label: "Play guitar", kind: "use", durationMs: 1.5 * MIN, needs: { fun: 30 }, pose: "sit",
    status: "Playing guitar 🎸", skill: { key: "creativity", xp: 20 } },
  work_out: { id: "work_out", label: "Work out", kind: "use", durationMs: 1.5 * MIN, needs: { energy: -15, hygiene: -15, fun: 10 }, pose: "stand",
    status: "Working out 💪", skill: { key: "fitness", xp: 25 } },
  go_out: { id: "go_out", label: "Go outside", kind: "travel", durationMs: 0, status: "" },

  // Street
  go_home: { id: "go_home", label: "Go home", kind: "travel", durationMs: 0, status: "" },
  bodega_bec: { id: "bodega_bec", label: "Bacon, egg & cheese ($6)", kind: "use", durationMs: 40_000, needs: { hunger: 40 }, cost: 6, pose: "stand",
    status: "Chopping a BEC 🥪", moodlet: { id: "bodega-cat", label: "Bodega cat sat on you", value: 5, hours: 1 } },
  bodega_coffee: { id: "bodega_coffee", label: "Coffee ($3)", kind: "use", durationMs: 20_000, needs: { energy: 15 }, cost: 3, pose: "stand", status: "Coffee ☕" },
  halal: { id: "halal", label: "Chicken over rice ($10)", kind: "use", durationMs: 1 * MIN, needs: { hunger: 65 }, cost: 10, pose: "stand",
    status: "White sauce, hot sauce 🍗" },
  laundry: { id: "laundry", label: "Wash clothes ($5)", kind: "use", durationMs: 1 * MIN, needs: { hygiene: 30 }, cost: 5, pose: "sit", status: "Laundry 🧺" },
  haircut: { id: "haircut", label: "Get a lineup ($20)", kind: "use", durationMs: 1.5 * MIN, needs: { hygiene: 15, social: 20 }, cost: 20, pose: "sit",
    status: "Getting a lineup 💈", moodlet: { id: "fresh-cut", label: "Fresh cut", value: 10, hours: 6 } },
  people_watch: { id: "people_watch", label: "Sit and people-watch", kind: "use", durationMs: 1 * MIN, needs: { fun: 12, social: 6 }, pose: "sit",
    status: "People-watching 👀" },
  go_to_work: { id: "go_to_work", label: "Take the L to work", kind: "work", durationMs: 0, status: "" },

  // Phone (no object)
  call_home: { id: "call_home", label: "Call home ($2)", kind: "use", durationMs: 1 * MIN, needs: { social: 40 }, cost: 2, pose: "stand",
    status: "On the phone with family 📞", moodlet: { id: "called-home", label: "Heard from family", value: 6, hours: 3 } },
};

export type ActionId = keyof typeof ACTIONS;
