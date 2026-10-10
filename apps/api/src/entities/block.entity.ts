import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

@Entity("blocks")
@Unique(["blockerId", "blockedId"])
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  blockerId!: string;

  @Column({ type: "uuid" })
  @Index()
  blockedId!: string;

  @Column({ type: "timestamp", default: () => "now()" })
  createdAt!: Date;
}
