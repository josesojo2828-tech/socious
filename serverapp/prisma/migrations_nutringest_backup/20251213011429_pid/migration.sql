/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `NutritionalPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "NutritionalPlan" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NutritionalPlan_shareToken_key" ON "NutritionalPlan"("shareToken");
