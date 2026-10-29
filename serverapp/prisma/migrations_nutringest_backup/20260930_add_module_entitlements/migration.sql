-- Migration: add_module_entitlements
-- Adds the module enablement engine schema: AddOn catalog, polymorphic
-- Entitlement, Invoice/InvoiceLine, FieldPolicy, and org-scoped UserPermission.
-- Fully additive and nullable — existing wallet/subscription flows untouched.

-- CreateEnum
CREATE TYPE "AddOnStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "InvoiceLineType" AS ENUM ('BASE_PLAN', 'SEAT', 'ADDON');

-- CreateEnum
CREATE TYPE "FieldAccess" AS ENUM ('HIDDEN', 'READONLY', 'EDITABLE');

-- DropIndex: old global unique is replaced by the widened (userId, organizationId, permission)
DROP INDEX "user_permission_user_id_permission_key";

-- AlterTable: add org scope to UserPermission (nullable, backward-compatible)
ALTER TABLE "user_permission" ADD COLUMN     "organization_id" TEXT;

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "grants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fieldPolicies" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "addOnId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtPurchase" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "InvoiceLineType" NOT NULL,
    "refId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "addOnId" TEXT,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldPolicy" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "formKey" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "access" "FieldAccess" NOT NULL DEFAULT 'EDITABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_key_key" ON "AddOn"("key");

-- CreateIndex
CREATE INDEX "AddOn_active_idx" ON "AddOn"("active");

-- CreateIndex
CREATE INDEX "Entitlement_organizationId_idx" ON "Entitlement"("organizationId");

-- CreateIndex
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");

-- CreateIndex: PARTIAL unique for ORG-scoped entitlements.
-- Prisma cannot express partial indexes, and a plain composite UNIQUE on
-- (organizationId, addOnId) would NOT dedupe rows where organizationId IS NULL
-- (Postgres treats NULL != NULL). Uniqueness is therefore enforced with raw SQL.
CREATE UNIQUE INDEX "entitlement_org_unique" ON "Entitlement" ("organizationId", "addOnId") WHERE "organizationId" IS NOT NULL;

-- CreateIndex: PARTIAL unique for PERSONAL entitlements (user-owned, no org).
CREATE UNIQUE INDEX "entitlement_user_unique" ON "Entitlement" ("userId", "addOnId") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

-- AddConstraint: an Entitlement MUST have EXACTLY ONE owner (org XOR user).
-- Mirrors the polymorphic Subscription semantics and makes orphaned rows impossible.
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_periodStart_key" ON "Invoice"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "FieldPolicy_moduleKey_role_idx" ON "FieldPolicy"("moduleKey", "role");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPolicy_moduleKey_role_formKey_fieldKey_key" ON "FieldPolicy"("moduleKey", "role", "formKey", "fieldKey");

-- CreateIndex
CREATE INDEX "user_permission_organization_id_idx" ON "user_permission"("organization_id");

-- CreateIndex: widened org-scoped unique (NULL != NULL, so it does NOT dedupe global rows)
CREATE UNIQUE INDEX "user_permission_user_id_organization_id_permission_key" ON "user_permission"("user_id", "organization_id", "permission");

-- CreateIndex: MANDATORY partial unique — Postgres does not dedupe NULLs in the
-- composite unique above, so global grants (organization_id IS NULL) need their
-- own uniqueness guarantee on (user_id, permission).
CREATE UNIQUE INDEX "user_permission_global_unique" ON "user_permission" ("user_id", "permission") WHERE "organization_id" IS NULL;

-- Backfill: existing rows are global/personal grants — force organization_id = NULL.
-- The ADD COLUMN above already leaves them NULL; this explicit, idempotent pass
-- documents and enforces the intended semantics.
UPDATE "user_permission" SET "organization_id" = NULL WHERE "organization_id" IS NULL;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
