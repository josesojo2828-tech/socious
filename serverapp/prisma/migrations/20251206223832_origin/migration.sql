/*
  Warnings:

  - You are about to drop the column `calories` on the `ExchangeList` table. All the data in the column will be lost.
  - You are about to drop the column `unity` on the `ExchangeList` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ExchangeListItem` table. All the data in the column will be lost.
  - You are about to drop the column `baseUnit` on the `FoodItem` table. All the data in the column will be lost.
  - You are about to drop the `FoodPortion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `baseKcal` to the `ExchangeList` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER');

-- DropForeignKey
ALTER TABLE "public"."ExchangeListItem" DROP CONSTRAINT "ExchangeListItem_foodId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FoodPortion" DROP CONSTRAINT "FoodPortion_foodId_fkey";

-- AlterTable
ALTER TABLE "ExchangeList" DROP COLUMN "calories",
DROP COLUMN "unity",
ADD COLUMN     "baseCarbs" DECIMAL(65,30),
ADD COLUMN     "baseFat" DECIMAL(65,30),
ADD COLUMN     "baseKcal" INTEGER NOT NULL,
ADD COLUMN     "baseProtein" DECIMAL(65,30),
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "ExchangeListItem" DROP COLUMN "description",
ADD COLUMN     "foodExchangeListId" TEXT,
ADD COLUMN     "servingLabel" TEXT;

-- AlterTable
ALTER TABLE "FoodItem" DROP COLUMN "baseUnit";

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "category" "MenuCategory" DEFAULT 'OTHER',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "totalCarbs" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "totalFats" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "totalProtein" DECIMAL(65,30) DEFAULT 0,
ALTER COLUMN "totalKcal" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "unit" TEXT;

-- DropTable
DROP TABLE "public"."FoodPortion";

-- DropEnum
DROP TYPE "public"."FoodUnit";

-- AddForeignKey
ALTER TABLE "ExchangeListItem" ADD CONSTRAINT "ExchangeListItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeListItem" ADD CONSTRAINT "ExchangeListItem_foodExchangeListId_fkey" FOREIGN KEY ("foodExchangeListId") REFERENCES "FoodExchangeList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
