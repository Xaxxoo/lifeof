import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("objects")
export class PlacedObject {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  @Index()
  roomId!: string;

  @Column({ type: "varchar" })
  itemId!: string;

  @Column({ type: "int" })
  x!: number;

  @Column({ type: "int" })
  y!: number;

  @Column({ type: "int", default: 0 })
  rot!: number;

  @Column({ type: "numeric", default: 0 })
  paid!: number;
}
