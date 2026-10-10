import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("reports")
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  reporterId!: string;

  @Column({ type: "uuid" })
  @Index()
  targetId!: string;

  @Column({ type: "varchar" })
  reason!: string;

  @Column({ type: "text", nullable: true })
  detail!: string | null;

  @Column({ type: "uuid", nullable: true })
  messageId!: string | null;

  @Column({ type: "varchar", default: "pending" })
  status!: string;

  @Column({ type: "timestamp", default: () => "now()" })
  createdAt!: Date;
}
