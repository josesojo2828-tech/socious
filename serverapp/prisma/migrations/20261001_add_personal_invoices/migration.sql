-- Migration: add_personal_invoices
-- Makes Invoice polymorphic (organization XOR user) so PERSONAL entitlements can
-- be invoiced, mirroring Entitlement. Idempotency is enforced with PARTIAL UNIQUE
-- indexes because Postgres does not dedupe NULLs in a composite unique
-- (NULL != NULL), exactly like the Entitlement fix in 20260930.
-- Fully additive: existing org invoices keep their organizationId.

-- AlterTable: allow personal invoices (no organization owner)
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable: add the personal owner column
ALTER TABLE "Invoice" ADD COLUMN     "userId" TEXT;

-- DropIndex: the org-only composite unique cannot cover personal rows and would
-- be redundant with the partial org index below.
DROP INDEX "Invoice_organizationId_periodStart_key";

-- CreateIndex: PARTIAL unique for ORG invoices.
CREATE UNIQUE INDEX "invoice_org_period_unique" ON "Invoice" ("organizationId", "periodStart") WHERE "organizationId" IS NOT NULL;

-- CreateIndex: PARTIAL unique for PERSONAL invoices (user-owned, no org).
CREATE UNIQUE INDEX "invoice_user_period_unique" ON "Invoice" ("userId", "periodStart") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

-- AddConstraint: an Invoice MUST have EXACTLY ONE owner (org XOR user).
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
