-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('TRANSFER', 'COLLABORATOR');

-- AlterTable
ALTER TABLE "PatientReferral" ADD COLUMN "type" "ReferralType" NOT NULL DEFAULT 'TRANSFER';
