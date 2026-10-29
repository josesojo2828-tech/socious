-- AlterTable (S1 legal-compliance: prueba de aceptación de términos)
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedIpHash" TEXT,
ADD COLUMN     "termsVersion" TEXT;
