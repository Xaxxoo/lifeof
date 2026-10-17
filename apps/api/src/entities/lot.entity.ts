import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";
import type { PlayerShop } from "@nyl/content";

/** One of the six lots on a player-founded block: for sale, owned and empty, or a built shop. */
@Entity("lots")
@Unique(["neighborhoodId", "index"])
export class Lot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  neighborhoodId!: string;

  @Column({ type: "int" })
  index!: number;

  @Column({ type: "uuid", nullable: true })
  @Index()
  ownerId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  shop!: PlayerShop | null;

  @Column({ type: "timestamp", default: () => "now()" })
  updatedAt!: Date;
}
