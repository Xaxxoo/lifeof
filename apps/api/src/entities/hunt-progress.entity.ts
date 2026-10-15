import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import type { HuntAsset } from "@nyl/content";

export type PayoutStatus = "pending" | "paid" | "failed";

export interface HuntPayout {
  status: PayoutStatus;
  asset: HuntAsset;
  amount: string;
  memo: string;
  attempts: number;
  txHash?: string;
  error?: string;
}

@Entity("hunt_progress")
@Index(["characterId", "huntId"], { unique: true })
export class HuntProgress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  characterId!: string;

  @Column({ type: "varchar", length: 16 })
  @Index()
  huntId!: string;

  /** Index of the step being looked for; equals steps.length once finished. */
  @Column({ type: "int", default: 0 })
  step!: number;

  /** When each step was found (ms), in order. */
  @Column({ type: "jsonb", default: () => "'[]'" })
  foundAt!: number[];

  @Column({ type: "bigint" })
  joinedAt!: number;

  @Column({ type: "bigint", nullable: true })
  completedAt!: number | null;

  /** Finishing place among prize winners (1 = first). Null if finished after the prizes ran out. */
  @Column({ type: "int", nullable: true })
  rank!: number | null;

  @Column({ type: "jsonb", nullable: true })
  payout!: HuntPayout | null;
}
