-- Reconciliation migration: brings the database in line with `schema.prisma`.
--
-- The database had drifted from this migrations folder:
--   * objects that were created outside Prisma (`db push`) were never captured
--     as migrations (PortfolioEvent, SystemSetting, PortfolioEventType,
--     ConsultationStatus.PENDING_APPROVAL, the Invoice foreign keys);
--   * the share-link access log was created with a column name that does not
--     match the model: the migration created "accessedAt" while the model maps
--     the field to "accessed_at", so every write through the Prisma client
--     failed with "column accessed_at does not exist".
--
-- Every statement is written to be idempotent, so this migration applies
-- cleanly both to a database that already carries these objects and to a
-- database built from this folder.

-- 1. Enum backing PortfolioEvent.eventType.
DO $$
BEGIN
  CREATE TYPE "PortfolioEventType" AS ENUM (
    'PAGE_VIEW',
    'CLICK_WHATSAPP',
    'CLICK_INSTAGRAM',
    'CLICK_LINKEDIN',
    'CLICK_FACEBOOK',
    'CLICK_TIKTOK',
    'CLICK_X',
    'CLICK_WEBSITE',
    'APPOINTMENT_REQUESTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Consultation status accepted by the model.
ALTER TYPE "ConsultationStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

-- 3. Share-link access log: align the column with the model's @map.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shared_link_access'
      AND column_name = 'accessedAt'
  ) THEN
    ALTER TABLE "shared_link_access" RENAME COLUMN "accessedAt" TO "accessed_at";
  END IF;
END $$;

-- 4. PortfolioEvent (created outside Prisma).
CREATE TABLE IF NOT EXISTS "PortfolioEvent" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "eventType" "PortfolioEventType" NOT NULL,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PortfolioEvent_nutritionistId_eventType_idx"
  ON "PortfolioEvent"("nutritionistId", "eventType");

CREATE INDEX IF NOT EXISTS "PortfolioEvent_createdAt_idx"
  ON "PortfolioEvent"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PortfolioEvent_nutritionistId_fkey'
  ) THEN
    ALTER TABLE "PortfolioEvent"
      ADD CONSTRAINT "PortfolioEvent_nutritionistId_fkey"
      FOREIGN KEY ("nutritionistId") REFERENCES "Nutritionist"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. SystemSetting (created outside Prisma).
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

-- 6. Invoice foreign keys: the model requires ON DELETE SET NULL.
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_organizationId_fkey";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_userId_fkey";
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. CampaignPlan.duration no longer carries a default.
ALTER TABLE "CampaignPlan" ALTER COLUMN "duration" DROP DEFAULT;

-- 8. Columns removed from the models.
ALTER TABLE "MarketProduct" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "MarketReview" DROP COLUMN IF EXISTS "responseAt";
