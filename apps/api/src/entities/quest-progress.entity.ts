import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("quest_progress")
export class QuestProgress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index({ unique: true })
  characterId!: string;

  @Column({ type: "varchar" })
  questId!: string;

  @Column({ type: "int", default: 0 })
  step!: number;

  @Column({ type: "jsonb", default: () => "'{}'" })
  flags!: Record<string, unknown>;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ type: "bigint" })
  startedAt!: number;

  @Column({ type: "bigint", nullable: true })
  completedAt!: number | null;
}
