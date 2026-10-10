import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

@Entity("crew_members")
@Unique(["crewId", "characterId"])
export class CrewMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  crewId!: string;

  @Column({ type: "uuid", unique: true })
  @Index()
  characterId!: string;

  @Column({ type: "varchar" })
  role!: string;

  @Column({ type: "bigint" })
  joinedAt!: number;
}
