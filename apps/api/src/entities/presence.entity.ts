import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("presence")
export class Presence {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  characterId!: string;

  @Column({ type: "varchar" })
  @Index()
  roomId!: string;

  @Column({ type: "jsonb" })
  path!: { x: number; y: number }[];

  @Column({ type: "bigint" })
  startedAt!: number;

  @Column({ type: "bigint" })
  @Index()
  updatedAt!: number;
}
