import { Entity, PrimaryColumn, Column } from "typeorm";

/** A player-founded neighborhood. The id is the neighborhood's id in FOUNDABLE, so each is founded once. */
@Entity("neighborhoods")
export class Neighborhood {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  street!: string;

  @Column({ type: "uuid" })
  founderId!: string;

  @Column({ type: "timestamp", default: () => "now()" })
  createdAt!: Date;
}
