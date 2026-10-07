import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("ledger")
export class LedgerEntry {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  characterId!: string;

  @Column({ type: "numeric" })
  delta!: number;

  @Column({ type: "numeric" })
  balanceAfter!: number;

  @Column({ type: "varchar" })
  reason!: string;

  @Column({ type: "varchar", nullable: true })
  label!: string | null;

  @Column({ type: "varchar", unique: true })
  @Index()
  requestId!: string;
}
