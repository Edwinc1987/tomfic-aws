-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "Inventory" ADD COLUMN "closedBy" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT '2conteos';
ALTER TABLE "Inventory" ADD COLUMN "snapshotsJson" JSONB;
