/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `FoodExchangeList` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `FoodItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FoodExchangeList_name_key" ON "FoodExchangeList"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_name_key" ON "FoodItem"("name");
