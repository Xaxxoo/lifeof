import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

@Entity("relationships")
@Unique(["characterId", "targetId"])
export class Relationship {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  characterId!: string;

  @Column({ type: "uuid" })
  @Index()
  targetId!: string;

  @Column({ type: "varchar", default: "stranger" })
  level!: string;

  @Column({ type: "int", default: 0 })
  points!: number;

  @Column({ type: "varchar", nullable: true })
  romantic!: string | null;

  @Column({ type: "bigint" })
  lastInteractionAt!: number;

  @Column({ type: "timestamp", default: () => "now()" })
  createdAt!: Date;
}
