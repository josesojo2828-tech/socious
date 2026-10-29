-- Safe Enum Creation
DO $$ BEGIN
    CREATE TYPE "InstitutionalCollaboratorRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "InstitutionalCalculationCollaborator" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "role" "InstitutionalCollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionalCalculationCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionalCalculationCollaborator_calculationId_nutritionistId_key" ON "InstitutionalCalculationCollaborator"("calculationId", "nutritionistId");

-- CreateIndex IF NOT EXISTS
CREATE INDEX IF NOT EXISTS "InstitutionalCalculationCollaborator_nutritionistId_idx" ON "InstitutionalCalculationCollaborator"("nutritionistId");

-- CreateIndex IF NOT EXISTS
CREATE INDEX IF NOT EXISTS "InstitutionalCalculationCollaborator_calculationId_idx" ON "InstitutionalCalculationCollaborator"("calculationId");

-- AddForeignKey IF NOT EXISTS
DO $$ BEGIN
    ALTER TABLE "InstitutionalCalculationCollaborator" ADD CONSTRAINT "InstitutionalCalculationCollaborator_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "InstitutionalCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InstitutionalCalculationCollaborator" ADD CONSTRAINT "InstitutionalCalculationCollaborator_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InstitutionalCalculationCollaborator" ADD CONSTRAINT "InstitutionalCalculationCollaborator_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Nutritionist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
