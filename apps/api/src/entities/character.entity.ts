import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("characters")
export class Character {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  token!: string;

  @Column({ type: "varchar", length: 20 })
  name!: string;

  @Column({ type: "varchar" })
  origin!: string;

  @Column({ type: "varchar" })
  status!: string;

  @Column({ type: "varchar" })
  trait!: string;

  @Column({ type: "varchar", default: "prefer-not" })
  gender!: string;

  @Column({ type: "varchar", default: "prefer-not" })
  sexuality!: string;

  @Column({ type: "jsonb" })
  look!: { skin: string; shirt: string; pants: string; hair: string; hairColor: string };

  @Column({ type: "numeric", default: 0 })
  cash!: number;

  @Column({ type: "jsonb" })
  needs!: { hunger: number; energy: number; hygiene: number; bladder: number; fun: number; social: number };

  @Column({ type: "bigint" })
  needsUpdatedAt!: number;

  @Column({ type: "bigint" })
  lastSeenAt!: number;

  @Column({ type: "jsonb" })
  skills!: { cooking: number; charisma: number; fitness: number; coding: number; creativity: number; hustle: number };

  @Column({ type: "jsonb", default: [] })
  moodlets!: { id: string; label: string; value: number; expiresAt: number }[];

  @Column({ type: "varchar" })
  roomId!: string;

  @Column({ type: "jsonb", nullable: true })
  activity!: {
    id: string;
    actionId: string;
    kind: "use" | "travel" | "work" | "ride";
    roomId: string;
    target: string;
    startsAt: number;
    endsAt: number;
    needs?: Record<string, number>;
    pose?: "stand" | "sit" | "sleep";
    status: string;
    travelTo?: string;
    moodMultiplier?: number;
    trainDelayed?: boolean;
    rideMoment?: string;
    tipped?: boolean;
    rideLines?: string[];
  } | null;

  @Column({ type: "jsonb", nullable: true })
  job!: { careerId: string; level: number; shiftsAtLevel: number; totalShifts: number } | null;

  @Column({ type: "jsonb" })
  shiftWeek!: { period: string; count: number };

  @Column({ type: "varchar", nullable: true })
  autopilotDay!: string | null;

  @Column({ type: "jsonb", nullable: true })
  gig!: {
    id: string;
    gigId: string;
    roomId: string;
    steps: { target: string; label: string; action: string }[];
    step: number;
    pay: number;
    tip: number;
    startedAt: number;
    deadline: number;
  } | null;

  @Column({ type: "jsonb", nullable: true })
  gigStats!: { done: number; rating: number } | null;

  @Column({ type: "jsonb" })
  rent!: { perWeek: number; lastPeriod: string; owed: number; missedWeeks: number };

  /** The home you live in (rental or your own lot); null until first needed. */
  @Column({ type: "uuid", nullable: true })
  homeId!: string | null;

  /** Paints and floors you've bought; they stay yours when you move. */
  @Column({ type: "jsonb", default: () => `'{"paints":["cream"],"floors":["oak"]}'` })
  unlocks!: { paints: string[]; floors: string[] };

  @Column({ type: "bigint", default: () => "EXTRACT(EPOCH FROM now()) * 1000" })
  createdAt!: number;

  /** Origin story progress: maps origin → completed chapter number. */
  @Column({ type: "jsonb", default: () => "'{}'" })
  storyProgress!: Record<string, number>;
}
