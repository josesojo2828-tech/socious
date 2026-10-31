-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL DEFAULT 'COUNT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitOfMeasure_organizationId_idx" ON "UnitOfMeasure"("organizationId");

-- CreateIndex
CREATE INDEX "UnitOfMeasure_abbreviation_idx" ON "UnitOfMeasure"("abbreviation");

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
