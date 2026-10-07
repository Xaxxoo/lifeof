import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("city_state")
export class CityState {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  key!: string;

  @Column({ type: "jsonb" })
  subway!: {
    lines: { line: string; status: "good" | "delays" | "suspended" | "planned"; text: string }[];
    source: "live" | "simulated";
    updatedAt: number;
    lastLiveAt: number;
  };

  @Column({ type: "jsonb" })
  weather!: {
    tempF: number;
    summary: string;
    precipChance: number;
    alerts: string[];
    source: "live" | "simulated";
    updatedAt: number;
    lastLiveAt: number;
  };

  @Column({ type: "jsonb" })
  blockEvents!: {
    items: { type: string; count: number; neighborhood?: string }[];
    source: "live" | "simulated";
    updatedAt: number;
    lastLiveAt: number;
  };
}
