import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("crews")
export class Crew {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 24 })
  name!: string;

  @Column({ type: "uuid" })
  @Index()
  leaderId!: string;

  @Column({ type: "jsonb", nullable: true })
  weeklyGoal!: { type: string; target: number; progress: number; period: string } | null;

  @Column({ type: "timestamp", default: () => "now()" })
  createdAt!: Date;
}
