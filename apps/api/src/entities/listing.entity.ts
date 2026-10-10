import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("listings")
export class Listing {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  homeId!: string;

  @Column({ type: "uuid" })
  @Index()
  landlordId!: string;

  @Column({ type: "varchar" })
  kind!: string;

  @Column({ type: "numeric" })
  rentPerWeek!: number;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", default: "open" })
  status!: string;

  @Column({ type: "int", default: 0 })
  applicantCount!: number;

  @Column({ type: "bigint" })
  createdAt!: number;

  @Column({ type: "bigint", nullable: true })
  closedAt!: number | null;
}
