-- AlterTable
ALTER TABLE "CashRegister" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "CashShift" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_organizationId_idx" ON "Branch"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_organizationId_name_key" ON "Branch"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Backfill (S10): every existing document belongs to its
-- organization's default branch, created here for organizations that
-- do not have one yet. New branches are created by the application
-- (organization fixture + createOrganization).
-- ============================================================
INSERT INTO "Branch" ("id", "organizationId", "name", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", 'Principal', TRUE, TRUE, NOW(), NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Branch" b WHERE b."organizationId" = o."id" AND b."isDefault" = TRUE
);

UPDATE "Sale" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = s."organizationId" AND b."isDefault" = TRUE AND s."branchId" IS NULL;

UPDATE "Order" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = s."organizationId" AND b."isDefault" = TRUE AND s."branchId" IS NULL;

UPDATE "CashRegister" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = s."organizationId" AND b."isDefault" = TRUE AND s."branchId" IS NULL;

-- CashShift has no organizationId of its own: it belongs to the register.
UPDATE "CashShift" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = (SELECT c."organizationId" FROM "CashRegister" c WHERE c."id" = s."cashRegisterId")
  AND b."isDefault" = TRUE AND s."branchId" IS NULL;

UPDATE "Purchase" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = s."organizationId" AND b."isDefault" = TRUE AND s."branchId" IS NULL;

UPDATE "StockMovement" s SET "branchId" = b."id" FROM "Branch" b
WHERE b."organizationId" = s."organizationId" AND b."isDefault" = TRUE AND s."branchId" IS NULL;
