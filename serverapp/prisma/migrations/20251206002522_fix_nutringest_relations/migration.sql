/*
  Warnings:

  - You are about to drop the column `caloria` on the `FoodExchangeList` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodExchangeList" DROP COLUMN "caloria",
ADD COLUMN     "calories" DECIMAL(65,30);
