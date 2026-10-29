/*
  Warnings:

  - You are about to drop the column `foodId` on the `ExchangeListItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ExchangeListItem" DROP CONSTRAINT "ExchangeListItem_foodId_fkey";

-- AlterTable
ALTER TABLE "ExchangeListItem" DROP COLUMN "foodId";
