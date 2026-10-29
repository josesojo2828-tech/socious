/*
  Warnings:

  - You are about to drop the column `date` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the `AnthropometricAssessment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[anthropometryId]` on the table `Consultation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[planId]` on the table `Consultation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nutritionistId` to the `Consultation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `Consultation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'NUTRITIONIST', 'PATIENT');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('FIRST_TIME', 'FOLLOW_UP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WEIGHT', 'MEASUREMENT', 'HABIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "public"."AnthropometricAssessment" DROP CONSTRAINT "AnthropometricAssessment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DietPlanTemplate" DROP CONSTRAINT "DietPlanTemplate_nutritionistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExchangeList" DROP CONSTRAINT "ExchangeList_nutritionistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Menu" DROP CONSTRAINT "Menu_nutritionistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Patient" DROP CONSTRAINT "Patient_nutritionistId_fkey";

-- AlterTable
ALTER TABLE "Consultation" DROP COLUMN "date",
DROP COLUMN "diagnosis",
DROP COLUMN "updatedAt",
ADD COLUMN     "anthropometryId" TEXT,
ADD COLUMN     "nutritionistId" TEXT NOT NULL,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "type" "ConsultationType" NOT NULL DEFAULT 'FOLLOW_UP';

-- AlterTable
ALTER TABLE "DietDay" ADD COLUMN     "nutritionalPlanId" TEXT,
ALTER COLUMN "dietPlanId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "ShoppingList" ALTER COLUMN "name" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."AnthropometricAssessment";

-- CreateTable
CREATE TABLE "Nutritionist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseCode" TEXT,
    "specialty" TEXT,

    CONSTRAINT "Nutritionist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyHistory" JSONB,
    "personalHistory" JSONB,
    "physicalActivity" TEXT,
    "sleepHours" INTEGER,
    "smoking" BOOLEAN NOT NULL DEFAULT false,
    "alcohol" TEXT,
    "allergies" TEXT[],
    "dislikes" TEXT[],
    "intolerances" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anthropometry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "bmi" DECIMAL(65,30),
    "tricipital" DECIMAL(65,30),
    "bicipital" DECIMAL(65,30),
    "subscapular" DECIMAL(65,30),
    "suprailiac" DECIMAL(65,30),
    "abdominal" DECIMAL(65,30),
    "thigh" DECIMAL(65,30),
    "calf" DECIMAL(65,30),
    "waist" DECIMAL(65,30),
    "hip" DECIMAL(65,30),
    "arm" DECIMAL(65,30),
    "fatPercentage" DECIMAL(65,30),
    "muscleMass" DECIMAL(65,30),
    "visceralFat" DECIMAL(65,30),
    "boneMass" DECIMAL(65,30),
    "metabolicAge" INTEGER,
    "waterPercentage" DECIMAL(65,30),

    CONSTRAINT "Anthropometry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT,
    "data" JSONB,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "startValue" DECIMAL(65,30),
    "targetValue" DECIMAL(65,30),
    "currentValue" DECIMAL(65,30),
    "deadline" TIMESTAMP(3),
    "isAchieved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionalPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "kcalTarget" INTEGER NOT NULL,
    "proteinTarget" INTEGER NOT NULL,
    "carbsTarget" INTEGER NOT NULL,
    "fatsTarget" INTEGER NOT NULL,
    "recommendations" TEXT,
    "waterIntake" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedMenu" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "eatingMoment" TEXT,
    "notes" TEXT,

    CONSTRAINT "AssignedMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedExchangeList" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "exchangeListId" TEXT NOT NULL,
    "portions" DECIMAL(65,30) NOT NULL,
    "eatingMoment" TEXT,

    CONSTRAINT "AssignedExchangeList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedSupplement" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "brand" TEXT,

    CONSTRAINT "AssignedSupplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nutritionist_userId_key" ON "Nutritionist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_patientId_key" ON "Anamnesis"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_anthropometryId_key" ON "Consultation"("anthropometryId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_planId_key" ON "Consultation"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- AddForeignKey
ALTER TABLE "Nutritionist" ADD CONSTRAINT "Nutritionist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeList" ADD CONSTRAINT "ExchangeList_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanTemplate" ADD CONSTRAINT "DietPlanTemplate_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_anthropometryId_fkey" FOREIGN KEY ("anthropometryId") REFERENCES "Anthropometry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionalPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anthropometry" ADD CONSTRAINT "Anthropometry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionalPlan" ADD CONSTRAINT "NutritionalPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedMenu" ADD CONSTRAINT "AssignedMenu_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedMenu" ADD CONSTRAINT "AssignedMenu_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedExchangeList" ADD CONSTRAINT "AssignedExchangeList_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedExchangeList" ADD CONSTRAINT "AssignedExchangeList_exchangeListId_fkey" FOREIGN KEY ("exchangeListId") REFERENCES "ExchangeList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedSupplement" ADD CONSTRAINT "AssignedSupplement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietDay" ADD CONSTRAINT "DietDay_nutritionalPlanId_fkey" FOREIGN KEY ("nutritionalPlanId") REFERENCES "NutritionalPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
