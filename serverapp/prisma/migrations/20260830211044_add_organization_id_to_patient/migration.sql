/*
  Warnings:

  - The `role` column on the `OrganizationMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `OrganizationMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,organizationId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('CLINIC_ADMIN', 'CLINIC_MANAGER', 'NUTRITIONIST', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE_PERIOD';

-- AlterTable
ALTER TABLE "OrganizationMember" DROP COLUMN "role",
ADD COLUMN     "role" "OrganizationRole" NOT NULL DEFAULT 'NUTRITIONIST',
DROP COLUMN "status",
ADD COLUMN     "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionRenewalJobLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalRenewed" INTEGER NOT NULL DEFAULT 0,
    "totalFailedNoFunds" INTEGER NOT NULL DEFAULT 0,
    "totalExpired" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionRenewalJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "notes" TEXT,
    "boxName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_organizationId_idx" ON "Appointment"("organizationId");

-- CreateIndex
CREATE INDEX "Appointment_nutritionistId_idx" ON "Appointment"("nutritionistId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Patient_organizationId_idx" ON "Patient"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_organizationId_key" ON "Subscription"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex (handle case where target already exists from previous attempt)
DO $$
BEGIN
  -- If target index already exists, we're good - skip rename
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'InstitutionalCalculationCollaborator_calculationId_nutritio_key'
  ) THEN
    -- Target already exists, nothing to do
    RAISE NOTICE 'Index InstitutionalCalculationCollaborator_calculationId_nutritio_key already exists, skipping rename';
  ELSIF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'InstitutionalCalculationCollaborator_calculationId_nutritionistId_key'
  ) THEN
    -- Source exists but target doesn't, do the rename
    ALTER INDEX "InstitutionalCalculationCollaborator_calculationId_nutritionistId_key" 
      RENAME TO "InstitutionalCalculationCollaborator_calculationId_nutritio_key";
    RAISE NOTICE 'Renamed index from _nutritionistId_key to _nutritio_key';
  ELSE
    -- Neither exists - this is unexpected but not fatal
    RAISE NOTICE 'Neither index variant found, skipping rename';
  END IF;
END $$;
