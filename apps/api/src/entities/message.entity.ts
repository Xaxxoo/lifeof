import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  @Index()
  roomId!: string;

  @Column({ type: "uuid" })
  characterId!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text" })
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
