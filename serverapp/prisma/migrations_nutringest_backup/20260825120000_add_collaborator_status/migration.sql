-- Safe Enum Creation
DO $$ BEGIN
    CREATE TYPE "InstitutionalCollaboratorStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "InstitutionalCalculationCollaborator" ADD COLUMN IF NOT EXISTS "status" "InstitutionalCollaboratorStatus" NOT NULL DEFAULT 'PENDING';
