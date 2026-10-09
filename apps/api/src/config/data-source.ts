import "reflect-metadata";
import { DataSource } from "typeorm";
import { entities } from "./database.config";

export default new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? "postgres",
  password: process.env.DATABASE_PASSWORD ?? "postgres",
  database: process.env.DATABASE_NAME ?? "nyl",
  entities,
  synchronize: false,
  migrations: [__dirname + "/../migrations/*{.ts,.js}"],
});
