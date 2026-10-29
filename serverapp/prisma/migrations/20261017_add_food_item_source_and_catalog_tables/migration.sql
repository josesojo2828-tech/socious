-- Migration: add_food_item_source_and_catalog_tables
-- Adds FoodSource enum, source & externalSourceId columns to FoodItem,
-- ensures countryCode default is 'GLOBAL', and creates FoodAlias & EnabledCountry tables.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FoodSource" AS ENUM ('GLOBAL_BASE', 'SMAE_MEXICO', 'USDA_FOOD_DATA', 'ARGENFOOD', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "countryCode" TEXT DEFAULT 'GLOBAL';
ALTER TABLE "FoodItem" ALTER COLUMN "countryCode" SET DEFAULT 'GLOBAL';
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "source" "FoodSource" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "externalSourceId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "FoodAlias" (
    "id" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EnabledCountry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL,
    "flagEmoji" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnabledCountry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FoodAlias_countryCode_name_idx" ON "FoodAlias"("countryCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EnabledCountry_code_key" ON "EnabledCountry"("code");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FoodAlias" ADD CONSTRAINT "FoodAlias_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
