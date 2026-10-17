import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerNeighborhoods1792213924839 implements MigrationInterface {
    name = 'PlayerNeighborhoods1792213924839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "neighborhoods" ("id" character varying NOT NULL, "street" character varying NOT NULL, "founderId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_249f3b7c3601adff79e56fa36f6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "neighborhoodId" character varying NOT NULL, "index" integer NOT NULL, "ownerId" uuid, "shop" jsonb, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_33eb55afc2d5296fcc6a245c50c" UNIQUE ("neighborhoodId", "index"), CONSTRAINT "PK_2bb990a4015865cb1daa1d22fd9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_668114f086a8faccf03f97d85b" ON "lots" ("ownerId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_668114f086a8faccf03f97d85b"`);
        await queryRunner.query(`DROP TABLE "lots"`);
        await queryRunner.query(`DROP TABLE "neighborhoods"`);
    }

}
