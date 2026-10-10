import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

@Entity("applications")
@Unique(["listingId", "applicantId"])
export class Application {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  listingId!: string;

  @Column({ type: "uuid" })
  @Index()
  applicantId!: string;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "varchar", default: "pending" })
  status!: string;

  @Column({ type: "bigint" })
  appliedAt!: number;
}
