import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("leases")
export class Lease {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  homeId!: string;

  @Column({ type: "uuid" })
  @Index()
  tenantId!: string;

  @Column({ type: "uuid" })
  @Index()
  landlordId!: string;

  @Column({ type: "numeric" })
  rentPerWeek!: number;

  @Column({ type: "varchar", default: "active" })
  status!: string;

  @Column({ type: "bigint" })
  startedAt!: number;

  @Column({ type: "bigint", nullable: true })
  endedAt!: number | null;
}
