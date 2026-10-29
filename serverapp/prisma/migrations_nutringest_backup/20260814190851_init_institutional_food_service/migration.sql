-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('KG', 'LITER', 'UNIT', 'PORTION');

-- CreateEnum
CREATE TYPE "InstitutionalActivityLevel" AS ENUM ('SEDENTARY', 'MODERATE', 'ACTIVE', 'CUSTOM');

-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "currentPrice" DECIMAL(10,2),
ADD COLUMN     "lastPriceSync" TIMESTAMP(3),
ADD COLUMN     "priceUnit" "PriceUnit" NOT NULL DEFAULT 'KG';

-- CreateTable
CREATE TABLE "FoodPriceHistory" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "unit" "PriceUnit" NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalCalculation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "nutritionistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalPeople" INTEGER NOT NULL,
    "maleCount" INTEGER NOT NULL,
    "femaleCount" INTEGER NOT NULL,
    "sampleWeights" DOUBLE PRECISION[],
    "averageWeight" DOUBLE PRECISION NOT NULL,
    "activityLevel" "InstitutionalActivityLevel" NOT NULL,
    "activityFactor" DOUBLE PRECISION NOT NULL,
    "vct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstitutionalCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalMealConfig" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "targetKcal" DOUBLE PRECISION NOT NULL,
    "proteinPercentage" DOUBLE PRECISION NOT NULL,
    "fatPercentage" DOUBLE PRECISION NOT NULL,
    "carbsPercentage" DOUBLE PRECISION NOT NULL,
    "proteinGrams" DOUBLE PRECISION NOT NULL,
    "fatGrams" DOUBLE PRECISION NOT NULL,
    "carbsGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstitutionalMealConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalMenu" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costPerCapita" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstitutionalMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalMenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "portionGrams" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "perCapitaCost" DOUBLE PRECISION NOT NULL,
    "totalQuantity" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstitutionalMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodPriceHistory_foodId_createdAt_idx" ON "FoodPriceHistory"("foodId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "FoodPriceHistory" ADD CONSTRAINT "FoodPriceHistory_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalCalculation" ADD CONSTRAINT "InstitutionalCalculation_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalMealConfig" ADD CONSTRAINT "InstitutionalMealConfig_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "InstitutionalCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalMenu" ADD CONSTRAINT "InstitutionalMenu_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "InstitutionalCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalMenuItem" ADD CONSTRAINT "InstitutionalMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "InstitutionalMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalMenuItem" ADD CONSTRAINT "InstitutionalMenuItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
