-- Migration: add_module_framework
-- Promotes `Module` to a first-class catalog: `Module` (capability), `AddOnModule`
-- (billable SKU N:M link) and `ModuleGrant` (materialized effective assignment).
-- Fully additive and nullable — existing entitlement/subscription flows untouched.
--
-- Hard rule: apply ONLY with `npx prisma migrate deploy` (NEVER `reset`/`dev`).
-- Polymorphic-owner uniqueness uses RAW PARTIAL UNIQUE INDEXES + an XOR CHECK
-- (Prisma cannot model partial indexes and a composite @@unique does not dedupe
-- NULL keys — same pattern as `Entitlement`/`UserPermission`).

-- CreateEnum
CREATE TYPE "ModuleScope" AS ENUM ('TENANT', 'USER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModuleGrantSource" AS ENUM ('PLAN', 'ADDON', 'MANUAL');

-- CreateEnum
CREATE TYPE "ModuleGrantStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- AlterTable: module key on the activity log (nullable, backward-compatible)
ALTER TABLE "UserActivityLog" ADD COLUMN     "moduleKey" TEXT;

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "scopes" "ModuleScope"[],
    "operatorPermit" TEXT,
    "dashboardKind" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnModule" (
    "addOnId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "AddOnModule_pkey" PRIMARY KEY ("addOnId","moduleId")
);

-- CreateTable
CREATE TABLE "ModuleGrant" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "source" "ModuleGrantSource" NOT NULL,
    "entitlementId" TEXT,
    "status" "ModuleGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT,

    CONSTRAINT "ModuleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE INDEX "Module_active_idx" ON "Module"("active");

-- CreateIndex
CREATE INDEX "ModuleGrant_moduleId_status_idx" ON "ModuleGrant"("moduleId", "status");

-- CreateIndex
CREATE INDEX "ModuleGrant_userId_status_idx" ON "ModuleGrant"("userId", "status");

-- CreateIndex
CREATE INDEX "ModuleGrant_organizationId_status_idx" ON "ModuleGrant"("organizationId", "status");

-- CreateIndex
CREATE INDEX "UserActivityLog_moduleKey_idx" ON "UserActivityLog"("moduleKey");

-- CreateIndex: PARTIAL unique for ORG-scoped grants.
-- A plain composite UNIQUE on (moduleId, organizationId) would NOT dedupe rows
-- where organizationId IS NULL (Postgres treats NULL != NULL), so uniqueness is
-- enforced with raw SQL.
CREATE UNIQUE INDEX "ModuleGrant_org_unique" ON "ModuleGrant" ("moduleId", "organizationId") WHERE "organizationId" IS NOT NULL;

-- CreateIndex: PARTIAL unique for PERSONAL grants (user-owned, no org).
CREATE UNIQUE INDEX "ModuleGrant_user_unique" ON "ModuleGrant" ("moduleId", "userId") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

-- AddConstraint: a ModuleGrant MUST have EXACTLY ONE owner (org XOR user).
-- Mirrors the polymorphic Entitlement semantics and makes orphaned rows impossible.
ALTER TABLE "ModuleGrant" ADD CONSTRAINT "ModuleGrant_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

-- AddForeignKey
ALTER TABLE "AddOnModule" ADD CONSTRAINT "AddOnModule_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnModule" ADD CONSTRAINT "AddOnModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleGrant" ADD CONSTRAINT "ModuleGrant_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleGrant" ADD CONSTRAINT "ModuleGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleGrant" ADD CONSTRAINT "ModuleGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (idempotent): link existing AddOn.modules (TEXT[]) to the catalog.
-- Only keys present in "Module" are linked; unknown keys are skipped. The catalog
-- seed (`module-catalog.seed.ts`) also re-runs this after upserting the catalog.
INSERT INTO "AddOnModule" ("addOnId", "moduleId")
SELECT a.id, m.id
FROM "AddOn" a
JOIN LATERAL unnest(a.modules) AS k ON true
JOIN "Module" m ON m.key = k
ON CONFLICT DO NOTHING;
