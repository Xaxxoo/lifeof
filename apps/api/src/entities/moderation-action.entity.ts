import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

/** Audit log: every mute, ban, hidden message and resolved report, by a moderator or the system. */
@Entity("moderation_actions")
export class ModerationAction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Character the action applies to. */
  @Column({ type: "uuid" })
  @Index()
  targetId!: string;

  /** mute | unmute | ban | unban | hide_message | dismiss_report */
  @Column({ type: "varchar" })
  action!: string;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  /** Moderator name from x-moderator, or "system" for automatic actions. */
  @Column({ type: "varchar" })
  actor!: string;

  @Column({ type: "uuid", nullable: true })
  reportId!: string | null;

  @Column({ type: "uuid", nullable: true })
  messageId!: string | null;

  /** For mutes and bans: when it ends (ms). */
  @Column({ type: "bigint", nullable: true })
  until!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
