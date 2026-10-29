-- DropIndex
DROP INDEX "public"."Patient_userId_key";

-- AlterTable
ALTER TABLE "ExchangeList" ALTER COLUMN "baseCarbs" SET DEFAULT 0,
ALTER COLUMN "baseFat" SET DEFAULT 0,
ALTER COLUMN "baseKcal" SET DEFAULT 0,
ALTER COLUMN "baseProtein" SET DEFAULT 0;
