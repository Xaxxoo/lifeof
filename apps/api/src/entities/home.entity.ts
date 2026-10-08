import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import type { HomeLayout } from "@nyl/content";

/**
 * A home: a rental you live in or a lot you own and build on. Its room id is `home:<id>`.
 * A character's first home reuses the character's id so older `home:<characterId>` rooms keep their furniture.
 */
@Entity("homes")
export class Home {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  ownerId!: string;

  @Column({ type: "varchar" })
  kind!: "rental" | "lot";

  /** Tier id for a rental, lot id for a lot. */
  @Column({ type: "varchar" })
  defId!: string;

  @Column({ type: "jsonb" })
  layout!: HomeLayout;

  @Column({ type: "bigint" })
  createdAt!: number;
}
