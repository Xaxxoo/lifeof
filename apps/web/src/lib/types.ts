/** Shared REST API response types. Field names match the API (id, createdAt) not Convex (_id, _creationTime). */

export interface CharacterDoc {
  id: string;
  name: string;
  origin: string;
  status: string;
  trait: string;
  look: { skin: string; hair: string; hairColor: string; shirt: string; pants: string };
  cash: number;
  needs: { hunger: number; energy: number; hygiene: number; bladder: number; fun: number; social: number };
  needsUpdatedAt: number;
  skills: Record<string, number>;
  roomId: string;
  activity: {
    kind: string;
    status: string;
    pose: string;
    startsAt: number;
    endsAt: number;
    target: string;
    moodMultiplier?: number;
    travelTo?: string;
    rideLines?: string[];
    rideMoment?: string;
    trainDelayed?: boolean;
    tipped?: boolean;
    roomId: string;
  } | null;
  job: {
    careerId: string;
    level: number;
    totalShifts: number;
    shiftsAtLevel: number;
  } | null;
  gig: {
    gigId: string;
    roomId: string;
    pay: number;
    deadline: number;
    step: number;
    steps: { target: string; action: string; label: string }[];
  } | null;
  gigStats: { done: number; rating: number } | null;
  moodlets: { id: string; label: string; value: number; expiresAt: number }[];
  rent: { perWeek: number; owed: number };
  homeId: string | null;
  unlocks: { paints: string[]; floors: string[] };
  shiftWeek: { period: string; count: number };
}

export interface CityStateDoc {
  subway: {
    source: "live" | "simulated";
    lines: { line: string; status: string; text: string }[];
  };
  weather: {
    source: "live" | "simulated";
    tempF: number;
    summary: string;
    precipChance: number;
    alerts: string[];
  };
  blockEvents: {
    source: "live" | "simulated";
    items: { type: string; count: number; neighborhood?: string }[];
  };
}

export interface Occupant {
  characterId: string;
  name: string;
  look: { skin: string; hair: string; hairColor: string; shirt: string; pants: string };
  path: { x: number; y: number }[];
  startedAt: number;
  activity: {
    status: string;
    pose: string;
    startsAt: number;
    endsAt: number;
    target: string;
  } | null;
}

export interface PlacedObjectDoc {
  id: string;
  roomId: string;
  itemId: string;
  x: number;
  y: number;
  rot: number;
  paid?: number;
}

export interface LedgerEntryDoc {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  label?: string;
  createdAt: string;
}

export interface MessageDoc {
  id: string;
  roomId: string;
  characterId: string;
  name: string;
  body: string;
  createdAt: string;
}

export interface StellarWalletDoc {
  publicKey: string;
  funded: boolean;
  trustlineEstablished: boolean;
  externalAddress: string | null;
  balances?: { xlm: string; usdt: string };
}

export interface GigOffer {
  offerId: string;
  gigId: string;
  emoji: string;
  app: string;
  name: string;
  pay: number;
  minutes: number;
  steps: { place: string }[];
  locked?: string;
}

export interface HomeDoc {
  id: string;
  kind: "rental" | "lot";
  defId: string;
  layout: import("@nyl/content").HomeLayout;
  ownerId?: string;
}

export interface HomesMine {
  residenceId: string;
  homes: HomeDoc[];
  unlocks: { paints: string[]; floors: string[] };
  rentPerWeek: number;
  tiers: { id: string; name: string; neighborhood: string; rentPerWeek: number; moveIn: number; blurb: string; width: number; height: number }[];
  lots: { id: string; name: string; neighborhood: string; width: number; height: number; price: number; blurb: string }[];
}

export type BuildOp =
  | { op: "add"; seg: import("@nyl/content").WallSeg }
  | { op: "remove"; x: number; y: number; side: "n" | "w" }
  | { op: "floor"; x: number; y: number; floorId: string | null };
