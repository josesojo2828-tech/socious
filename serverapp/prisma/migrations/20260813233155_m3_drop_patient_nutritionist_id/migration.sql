/*
  Warnings:

  - You are about to drop the column `nutritionistId` on the `Patient` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Patient" DROP CONSTRAINT "Patient_nutritionistId_fkey";

-- DropIndex
DROP INDEX "public"."Patient_nutritionistId_idx";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "nutritionistId";
