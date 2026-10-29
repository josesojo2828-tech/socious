-- DropForeignKey
ALTER TABLE "public"."Consultation" DROP CONSTRAINT "Consultation_patientId_fkey";

-- AlterTable
ALTER TABLE "Consultation" ALTER COLUMN "patientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
