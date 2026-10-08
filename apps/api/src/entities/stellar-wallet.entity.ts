import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("stellar_wallets")
export class StellarWallet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  @Index()
  characterId!: string;

  @Column({ type: "varchar", length: 56 })
  publicKey!: string;

  @Column({ type: "text" })
  encryptedSecret!: string;

  @Column({ type: "boolean", default: false })
  funded!: boolean;

  @Column({ type: "boolean", default: false })
  trustlineEstablished!: boolean;

  @Column({ type: "varchar", length: 56, nullable: true })
  externalAddress!: string | null;

  @Column({ type: "varchar", nullable: true })
  depositCursor!: string | null;
}
