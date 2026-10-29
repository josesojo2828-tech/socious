-- CreateEnum
CREATE TYPE "PatientNutritionistRole" AS ENUM ('PRIMARY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PatientReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "PatientNutritionist" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "role" "PatientNutritionistRole" NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientNutritionist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientReferral" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fromNutritionistId" TEXT NOT NULL,
    "toNutritionistId" TEXT NOT NULL,
    "status" "PatientReferralStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "responseMessage" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "PatientReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientNutritionist_nutritionistId_isActive_idx" ON "PatientNutritionist"("nutritionistId", "isActive");

-- CreateIndex
CREATE INDEX "PatientNutritionist_patientId_isActive_idx" ON "PatientNutritionist"("patientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PatientNutritionist_patientId_nutritionistId_key" ON "PatientNutritionist"("patientId", "nutritionistId");

-- CreateIndex
CREATE INDEX "PatientReferral_patientId_status_idx" ON "PatientReferral"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientReferral_toNutritionistId_status_idx" ON "PatientReferral"("toNutritionistId", "status");

-- AddForeignKey
ALTER TABLE "PatientNutritionist" ADD CONSTRAINT "PatientNutritionist_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNutritionist" ADD CONSTRAINT "PatientNutritionist_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNutritionist" ADD CONSTRAINT "PatientNutritionist_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Nutritionist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReferral" ADD CONSTRAINT "PatientReferral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReferral" ADD CONSTRAINT "PatientReferral_fromNutritionistId_fkey" FOREIGN KEY ("fromNutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReferral" ADD CONSTRAINT "PatientReferral_toNutritionistId_fkey" FOREIGN KEY ("toNutritionistId") REFERENCES "Nutritionist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReferral" ADD CONSTRAINT "PatientReferral_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "Nutritionist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
