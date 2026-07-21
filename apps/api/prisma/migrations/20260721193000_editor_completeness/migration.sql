-- prisma-migrate-disable-transaction
-- BlockAlign.END must be committed before other DDL; Postgres disallows enum ADD VALUE inside a multi-statement transaction with some follow-up ops.
ALTER TYPE "BlockAlign" ADD VALUE IF NOT EXISTS 'END';

ALTER TABLE "Media" DROP COLUMN IF EXISTS "altFa";
ALTER TABLE "Media" DROP COLUMN IF EXISTS "altEn";
