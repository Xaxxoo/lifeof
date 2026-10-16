import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792170372399 implements MigrationInterface {
    name = 'InitialSchema1792170372399'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "characters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "userId" uuid, "name" character varying(20) NOT NULL, "origin" character varying NOT NULL, "status" character varying NOT NULL, "trait" character varying NOT NULL, "gender" character varying NOT NULL DEFAULT 'prefer-not', "sexuality" character varying NOT NULL DEFAULT 'prefer-not', "look" jsonb NOT NULL, "cash" numeric NOT NULL DEFAULT '0', "needs" jsonb NOT NULL, "needsUpdatedAt" bigint NOT NULL, "lastSeenAt" bigint NOT NULL, "skills" jsonb NOT NULL, "moodlets" jsonb NOT NULL DEFAULT '[]', "roomId" character varying NOT NULL, "activity" jsonb, "job" jsonb, "shiftWeek" jsonb NOT NULL, "autopilotDay" character varying, "gig" jsonb, "gigStats" jsonb, "rent" jsonb NOT NULL, "homeId" uuid, "unlocks" jsonb NOT NULL DEFAULT '{"paints":["cream"],"floors":["oak"]}', "createdAt" bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM now()) * 1000, "storyProgress" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_d253566d24afc215310875900ef" UNIQUE ("token"), CONSTRAINT "PK_9d731e05758f26b9315dac5e378" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "presence" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "roomId" character varying NOT NULL, "path" jsonb NOT NULL, "startedAt" bigint NOT NULL, "updatedAt" bigint NOT NULL, CONSTRAINT "PK_e0088b38d7cf2dc6ad815d33e7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_981be446faaf6e6ab720125f52" ON "presence" ("characterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_21ee50f61d9e8c343a45b25872" ON "presence" ("roomId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c61b2c65d3303f6f7c163677bb" ON "presence" ("updatedAt") `);
        await queryRunner.query(`CREATE TABLE "objects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" character varying NOT NULL, "itemId" character varying NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "rot" integer NOT NULL DEFAULT '0', "paid" numeric NOT NULL DEFAULT '0', CONSTRAINT "PK_87b86663af0123508099f0d970a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_545934b094ea22d758325aa883" ON "objects" ("roomId") `);
        await queryRunner.query(`CREATE TABLE "ledger" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "delta" numeric NOT NULL, "balanceAfter" numeric NOT NULL, "reason" character varying NOT NULL, "label" character varying, "requestId" character varying NOT NULL, CONSTRAINT "UQ_475a93426ca62607aa565a5275e" UNIQUE ("requestId"), CONSTRAINT "PK_7a322e9157e5f42a16750ba2a20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b1429b14287fe62ccc8d322593" ON "ledger" ("characterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_475a93426ca62607aa565a5275" ON "ledger" ("requestId") `);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" character varying NOT NULL, "characterId" uuid NOT NULL, "name" character varying NOT NULL, "body" text NOT NULL, "safe" boolean, "visible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_aaa8a6effc7bd20a1172d3a3bc" ON "messages" ("roomId") `);
        await queryRunner.query(`CREATE TABLE "city_state" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "subway" jsonb NOT NULL, "weather" jsonb NOT NULL, "blockEvents" jsonb NOT NULL, CONSTRAINT "UQ_fa07731f84739a607888bc278d5" UNIQUE ("key"), CONSTRAINT "PK_37ecd8addf395545dcb0242a593" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stellar_wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "publicKey" character varying(56) NOT NULL, "encryptedSecret" text NOT NULL, "funded" boolean NOT NULL DEFAULT false, "trustlineEstablished" boolean NOT NULL DEFAULT false, "externalAddress" character varying(56), "depositCursor" character varying, CONSTRAINT "UQ_f79109d48feebaff547bf7a7a19" UNIQUE ("characterId"), CONSTRAINT "PK_5e7630ee4334a5ad4f92303192c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f79109d48feebaff547bf7a7a1" ON "stellar_wallets" ("characterId") `);
        await queryRunner.query(`CREATE TABLE "homes" ("id" uuid NOT NULL, "ownerId" uuid NOT NULL, "kind" character varying NOT NULL, "defId" character varying NOT NULL, "layout" jsonb NOT NULL, "createdAt" bigint NOT NULL, CONSTRAINT "PK_a85aa6f2e56424fc745effdd5f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_69fdbd46ea3ce3f8ae77279d09" ON "homes" ("ownerId") `);
        await queryRunner.query(`CREATE TABLE "relationships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "targetId" uuid NOT NULL, "level" character varying NOT NULL DEFAULT 'stranger', "points" integer NOT NULL DEFAULT '0', "romantic" character varying, "lastInteractionAt" bigint NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5df966e22475d1a3057344a417b" UNIQUE ("characterId", "targetId"), CONSTRAINT "PK_ba20e2f5cf487408e08e4dcecaf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_125cd3f71630a48a074bee1020" ON "relationships" ("characterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_526444956e3245eb52cc5b0a6a" ON "relationships" ("targetId") `);
        await queryRunner.query(`CREATE TABLE "blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blockerId" uuid NOT NULL, "blockedId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4abe7bad89347a663fc8f428d0d" UNIQUE ("blockerId", "blockedId"), CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ed8a33b2c1ac10922c2354f5cf" ON "blocks" ("blockerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b87401da081a7153ec3bd1e6ab" ON "blocks" ("blockedId") `);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporterId" uuid NOT NULL, "targetId" uuid NOT NULL, "reason" character varying NOT NULL, "detail" text, "messageId" uuid, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4353be8309ce86650def2f8572" ON "reports" ("reporterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cd7faa31851a2153125fd1af73" ON "reports" ("targetId") `);
        await queryRunner.query(`CREATE TABLE "direct_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderId" uuid NOT NULL, "recipientId" uuid NOT NULL, "senderName" character varying(20) NOT NULL, "body" text NOT NULL, "read" boolean NOT NULL DEFAULT false, "safe" boolean, "visible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8373c1bb93939978ef05ae650d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7aedd4c96c0e01b95b87b8cea5" ON "direct_messages" ("senderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e4b881cca7070948913330d7e3" ON "direct_messages" ("recipientId") `);
        await queryRunner.query(`CREATE TABLE "crews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(24) NOT NULL, "leaderId" uuid NOT NULL, "weeklyGoal" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4316f43ffc0d2bbb0c4c767ba5c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7d4f18a58905c33d569ec30312" ON "crews" ("leaderId") `);
        await queryRunner.query(`CREATE TABLE "crew_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "crewId" uuid NOT NULL, "characterId" uuid NOT NULL, "role" character varying NOT NULL, "joinedAt" bigint NOT NULL, CONSTRAINT "UQ_928e2033278b54c770839bc8243" UNIQUE ("characterId"), CONSTRAINT "UQ_4020cb157893f1d796e558e3d1b" UNIQUE ("crewId", "characterId"), CONSTRAINT "PK_722c7a3d215feeada44379f7099" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c4876f7a8bebd15e85c22b9a8f" ON "crew_members" ("crewId") `);
        await queryRunner.query(`CREATE INDEX "IDX_928e2033278b54c770839bc824" ON "crew_members" ("characterId") `);
        await queryRunner.query(`CREATE TABLE "listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "homeId" uuid NOT NULL, "landlordId" uuid NOT NULL, "kind" character varying NOT NULL, "rentPerWeek" numeric NOT NULL, "description" text, "status" character varying NOT NULL DEFAULT 'open', "applicantCount" integer NOT NULL DEFAULT '0', "createdAt" bigint NOT NULL, "closedAt" bigint, CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0977cc4b7806c6a3747e355590" ON "listings" ("homeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3317c9b0477ca3ab4142a6c8a" ON "listings" ("landlordId") `);
        await queryRunner.query(`CREATE TABLE "applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listingId" uuid NOT NULL, "applicantId" uuid NOT NULL, "message" text, "status" character varying NOT NULL DEFAULT 'pending', "appliedAt" bigint NOT NULL, CONSTRAINT "UQ_b1e8d0e06db4e0947b9ed5a3c66" UNIQUE ("listingId", "applicantId"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_037e630536209b3077051a9f00" ON "applications" ("listingId") `);
        await queryRunner.query(`CREATE INDEX "IDX_909867e55cc94e350ae38383cb" ON "applications" ("applicantId") `);
        await queryRunner.query(`CREATE TABLE "leases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "homeId" uuid NOT NULL, "tenantId" uuid NOT NULL, "landlordId" uuid NOT NULL, "rentPerWeek" numeric NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "startedAt" bigint NOT NULL, "endedAt" bigint, CONSTRAINT "PK_2668e338ab2d27079170ea55ea2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1c39367bcca9aaa9b05745f18a" ON "leases" ("homeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_175030e58c0d1accdb888a431d" ON "leases" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dde5e4767cfe02038f25291591" ON "leases" ("landlordId") `);
        await queryRunner.query(`CREATE TABLE "quest_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "questId" character varying NOT NULL, "step" integer NOT NULL DEFAULT '0', "flags" jsonb NOT NULL DEFAULT '{}', "completed" boolean NOT NULL DEFAULT false, "startedAt" bigint NOT NULL, "completedAt" bigint, CONSTRAINT "PK_00270f6acd4a18f1c6ae6aa216a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_941acee97b22b77f8da2cba2f0" ON "quest_progress" ("characterId") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hunts" ("id" character varying(16) NOT NULL, "name" character varying NOT NULL, "blurb" text NOT NULL, "sponsor" jsonb NOT NULL, "startsAt" bigint NOT NULL, "endsAt" bigint NOT NULL, "steps" jsonb NOT NULL, "prize" jsonb NOT NULL, "supply" integer NOT NULL, "claimed" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_663645859ac175502083c9e1cea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hunt_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "characterId" uuid NOT NULL, "huntId" character varying(16) NOT NULL, "step" integer NOT NULL DEFAULT '0', "foundAt" jsonb NOT NULL DEFAULT '[]', "joinedAt" bigint NOT NULL, "completedAt" bigint, "rank" integer, "payout" jsonb, CONSTRAINT "PK_b714c141feede319e2646145071" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_39ed02e6585b814886a6b8a2bf" ON "hunt_progress" ("characterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_476800c3c81f3ddd6732e35e96" ON "hunt_progress" ("huntId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_37469d6534ef886a701238f488" ON "hunt_progress" ("characterId", "huntId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_37469d6534ef886a701238f488"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_476800c3c81f3ddd6732e35e96"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39ed02e6585b814886a6b8a2bf"`);
        await queryRunner.query(`DROP TABLE "hunt_progress"`);
        await queryRunner.query(`DROP TABLE "hunts"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_941acee97b22b77f8da2cba2f0"`);
        await queryRunner.query(`DROP TABLE "quest_progress"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dde5e4767cfe02038f25291591"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_175030e58c0d1accdb888a431d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1c39367bcca9aaa9b05745f18a"`);
        await queryRunner.query(`DROP TABLE "leases"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_909867e55cc94e350ae38383cb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_037e630536209b3077051a9f00"`);
        await queryRunner.query(`DROP TABLE "applications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3317c9b0477ca3ab4142a6c8a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0977cc4b7806c6a3747e355590"`);
        await queryRunner.query(`DROP TABLE "listings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_928e2033278b54c770839bc824"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c4876f7a8bebd15e85c22b9a8f"`);
        await queryRunner.query(`DROP TABLE "crew_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d4f18a58905c33d569ec30312"`);
        await queryRunner.query(`DROP TABLE "crews"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4b881cca7070948913330d7e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7aedd4c96c0e01b95b87b8cea5"`);
        await queryRunner.query(`DROP TABLE "direct_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cd7faa31851a2153125fd1af73"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4353be8309ce86650def2f8572"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b87401da081a7153ec3bd1e6ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ed8a33b2c1ac10922c2354f5cf"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_526444956e3245eb52cc5b0a6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_125cd3f71630a48a074bee1020"`);
        await queryRunner.query(`DROP TABLE "relationships"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69fdbd46ea3ce3f8ae77279d09"`);
        await queryRunner.query(`DROP TABLE "homes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f79109d48feebaff547bf7a7a1"`);
        await queryRunner.query(`DROP TABLE "stellar_wallets"`);
        await queryRunner.query(`DROP TABLE "city_state"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aaa8a6effc7bd20a1172d3a3bc"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_475a93426ca62607aa565a5275"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1429b14287fe62ccc8d322593"`);
        await queryRunner.query(`DROP TABLE "ledger"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_545934b094ea22d758325aa883"`);
        await queryRunner.query(`DROP TABLE "objects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c61b2c65d3303f6f7c163677bb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_21ee50f61d9e8c343a45b25872"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_981be446faaf6e6ab720125f52"`);
        await queryRunner.query(`DROP TABLE "presence"`);
        await queryRunner.query(`DROP TABLE "characters"`);
    }

}
