import type { PropTag } from "./rooms";

/** Gig apps (PRD §6.4). Parody names only. Gigs are not open on a student visa. */
export interface GigDef {
  id: string;
  app: string;
  name: string;
  emoji: string;
  /** Each stop picks a prop on the current block with one of these tags. */
  stops: { tags: PropTag[]; action: "gig_pickup" | "gig_dropoff" | "gig_task" | "gig_vend" | "gig_flip"; label: string }[];
  pay: [number, number];
  /** Base tip, doubled in real rain, cut when late. */
  tip: number;
  requires?: { skill: "fitness" | "creativity" | "hustle"; level: number }[];
  skillXp: { key: "hustle" | "fitness" | "creativity"; xp: number };
  minutes: number;
}

export const GIGS: GigDef[] = [
  {
    id: "dashdash",
    app: "DashDash",
    name: "Food delivery",
    emoji: "🛵",
    stops: [
      { tags: ["food"], action: "gig_pickup", label: "Pick up the order" },
      { tags: ["residential", "business"], action: "gig_dropoff", label: "Drop it off" },
    ],
    pay: [8, 18],
    tip: 5,
    skillXp: { key: "hustle", xp: 12 },
    minutes: 3,
  },
  {
    id: "wagr",
    app: "Wagr",
    name: "Dog walk",
    emoji: "🐕",
    stops: [
      { tags: ["residential"], action: "gig_pickup", label: "Pick up the dog" },
      { tags: ["outdoor"], action: "gig_dropoff", label: "Let them sniff around" },
      { tags: ["residential"], action: "gig_dropoff", label: "Bring them home" },
    ],
    pay: [18, 24],
    tip: 4,
    requires: [{ skill: "fitness", level: 2 }],
    skillXp: { key: "fitness", xp: 15 },
    minutes: 4,
  },
  {
    id: "taskbunny",
    app: "TaskBunny",
    name: "Assemble furniture",
    emoji: "🔧",
    stops: [{ tags: ["residential", "business"], action: "gig_task", label: "Do the job" }],
    pay: [35, 90],
    tip: 10,
    requires: [{ skill: "fitness", level: 2 }],
    skillXp: { key: "hustle", xp: 20 },
    minutes: 5,
  },
  {
    id: "streetcart",
    app: "StreetCart",
    name: "Street vending",
    emoji: "🛒",
    stops: [
      { tags: ["food", "business"], action: "gig_pickup", label: "Pick up inventory" },
      { tags: ["vendor", "outdoor"], action: "gig_vend", label: "Set up and sell" },
    ],
    pay: [25, 55],
    tip: 8,
    requires: [{ skill: "hustle", level: 2 }],
    skillXp: { key: "hustle", xp: 18 },
    minutes: 4,
  },
  {
    id: "soleflip",
    app: "SoleFlip",
    name: "Sneaker flip",
    emoji: "👟",
    stops: [
      { tags: ["business"], action: "gig_pickup", label: "Cop the drop" },
      { tags: ["business", "residential"], action: "gig_flip", label: "Sell to the buyer" },
    ],
    pay: [40, 120],
    tip: 15,
    requires: [{ skill: "hustle", level: 3 }],
    skillXp: { key: "hustle", xp: 25 },
    minutes: 4,
  },
];

export const GIG_BY_ID: Record<string, GigDef> = Object.fromEntries(GIGS.map((g) => [g.id, g]));

/** Offers refresh every 10 minutes. */
export const GIG_WINDOW_MS = 10 * 60_000;
