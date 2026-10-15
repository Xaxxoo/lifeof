import { Entity, PrimaryColumn, Column } from "typeorm";
import type { HuntPrize, HuntSponsor, HuntStep } from "@nyl/content";

/** A treasure hunt campaign. Partners launch these; LAUNCH_HUNTS seeds the first. */
@Entity("hunts")
export class Hunt {
  @PrimaryColumn({ type: "varchar", length: 16 })
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text" })
  blurb!: string;

  @Column({ type: "jsonb" })
  sponsor!: HuntSponsor;

  @Column({ type: "bigint" })
  startsAt!: number;

  @Column({ type: "bigint" })
  endsAt!: number;

  @Column({ type: "jsonb" })
  steps!: HuntStep[];

  @Column({ type: "jsonb" })
  prize!: HuntPrize;

  @Column({ type: "int" })
  supply!: number;

  /** Prizes handed out so far. Only ever bumped by one atomic UPDATE … WHERE claimed < supply. */
  @Column({ type: "int", default: 0 })
  claimed!: number;

  /** Pull a campaign early without deleting anyone's progress. */
  @Column({ type: "boolean", default: true })
  active!: boolean;
}
