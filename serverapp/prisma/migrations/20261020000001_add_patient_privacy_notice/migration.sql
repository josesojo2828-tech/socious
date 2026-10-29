-- AlterTable (S5 legal-compliance: autorización del paciente para datos clínicos)
ALTER TABLE "Patient" ADD COLUMN     "privacy_notice_accepted_at" TIMESTAMP(3),
ADD COLUMN     "privacy_notice_version" TEXT,
ADD COLUMN     "privacy_notice_accepted_by_id" TEXT;
