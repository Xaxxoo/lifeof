import { MigrationInterface, QueryRunner } from "typeorm";

export class ChatModeration1792170373890 implements MigrationInterface {
    name = 'ChatModeration1792170373890'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "moderation_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "targetId" uuid NOT NULL, "action" character varying NOT NULL, "reason" text, "actor" character varying NOT NULL, "reportId" uuid, "messageId" uuid, "until" bigint, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d259906fb4d2a5ef718f1f66e35" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7fb1570a607d38b7a537a57c74" ON "moderation_actions" ("targetId") `);
        await queryRunner.query(`ALTER TABLE "characters" ADD "chatMutedUntil" bigint`);
        await queryRunner.query(`ALTER TABLE "characters" ADD "bannedUntil" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "characters" DROP COLUMN "bannedUntil"`);
        await queryRunner.query(`ALTER TABLE "characters" DROP COLUMN "chatMutedUntil"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7fb1570a607d38b7a537a57c74"`);
        await queryRunner.query(`DROP TABLE "moderation_actions"`);
    }

}
