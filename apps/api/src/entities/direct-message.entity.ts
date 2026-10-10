import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity("direct_messages")
export class DirectMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  senderId!: string;

  @Column({ type: "uuid" })
  @Index()
  recipientId!: string;

  @Column({ type: "varchar", length: 20 })
  senderName!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "boolean", default: false })
  read!: boolean;

  @Column({ type: "boolean", nullable: true })
  safe!: boolean | null;

  @Column({ type: "boolean", default: true })
  visible!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
