export interface QuestStepDef {
  title: string;
  hint: string;
  trigger: string;
  triggerValue?: string | number;
  reward?: number;
}

export interface QuestDef {
  id: string;
  name: string;
  steps: QuestStepDef[];
  completionReward: number;
}

export const ONBOARDING_QUEST: QuestDef = {
  id: "onboarding",
  name: "Welcome to Brooklyn",
  completionReward: 100,
  steps: [
    {
      title: "Step off the train",
      hint: "You just arrived. Look around.",
      trigger: "arrive_room",
      triggerValue: "crown-heights",
    },
    {
      title: "Open your phone",
      hint: "Tap the phone icon to check your apps.",
      trigger: "open_phone",
    },
    {
      title: "Ride the subway",
      hint: "Find a subway entrance and ride to another neighborhood.",
      trigger: "complete_ride",
      reward: 5,
    },
    {
      title: "Get something to eat",
      hint: "You look hungry. Find some food.",
      trigger: "complete_action",
      triggerValue: "food",
    },
    {
      title: "Check your bank",
      hint: "Open the bank tab on your phone.",
      trigger: "open_tab",
      triggerValue: "bank",
    },
    {
      title: "Go home",
      hint: "Tap the door on your block to go home.",
      trigger: "arrive_home",
    },
    {
      title: "Get some sleep",
      hint: "Tap your bed and get some rest.",
      trigger: "complete_action",
      triggerValue: "sleep",
    },
    {
      title: "Get a job",
      hint: "Open the jobs tab and apply for a career.",
      trigger: "apply_job",
      reward: 20,
    },
    {
      title: "Go to work",
      hint: "Head to the subway entrance and take the L to work.",
      trigger: "start_shift",
    },
    {
      title: "Survive rent day",
      hint: "Make sure you have at least $180 in cash.",
      trigger: "cash_threshold",
      triggerValue: 180,
    },
  ],
};

export const QUESTS: Record<string, QuestDef> = {
  [ONBOARDING_QUEST.id]: ONBOARDING_QUEST,
};
