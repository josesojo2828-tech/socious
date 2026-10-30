-- Restore hand-written partial indexes and CHECK constraints.
--
-- Prisma cannot express a partial index (`WHERE ...`) or a CHECK constraint in
-- `schema.prisma`, so when the migration history was regenerated as a single
-- `init` after the nutrition purge (2026-10-29) these objects were dropped from
-- the repository even though the previous history created them by hand:
-- `20260930_add_module_entitlements`, `20261001_add_personal_invoices` and
-- `20261003_add_module_framework` (now archived under
-- `prisma/migrations_nutringest_backup/`).
--
-- Without them the database accepts duplicate entitlements/grants/invoices and
-- rows with no owner or two owners, so the data-integrity suite fails. Verified
-- before applying: no existing row violates any of these rules.

-- ============================================================
-- Entitlement: one row per (tenant, add-on), exactly one owner
-- ============================================================
CREATE UNIQUE INDEX "entitlement_org_unique" ON "Entitlement" ("organizationId", "addOnId") WHERE "organizationId" IS NOT NULL;

CREATE UNIQUE INDEX "entitlement_user_unique" ON "Entitlement" ("userId", "addOnId") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

-- ============================================================
-- UserPermission: a global grant is unique per (user, permission)
-- ============================================================
CREATE UNIQUE INDEX "user_permission_global_unique" ON "user_permission" ("user_id", "permission") WHERE "organization_id" IS NULL;

-- ============================================================
-- Invoice: exactly one owner and one invoice per owner + period
-- ============================================================
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

CREATE UNIQUE INDEX "invoice_org_period_unique" ON "Invoice" ("organizationId", "periodStart") WHERE "organizationId" IS NOT NULL;

CREATE UNIQUE INDEX "invoice_user_period_unique" ON "Invoice" ("userId", "periodStart") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;

-- ============================================================
-- ModuleGrant: exactly one owner, one grant per (module, tenant)
-- ============================================================
ALTER TABLE "ModuleGrant" ADD CONSTRAINT "ModuleGrant_owner_xor_check" CHECK (("organizationId" IS NOT NULL AND "userId" IS NULL) OR ("organizationId" IS NULL AND "userId" IS NOT NULL));

CREATE UNIQUE INDEX "ModuleGrant_org_unique" ON "ModuleGrant" ("moduleId", "organizationId") WHERE "organizationId" IS NOT NULL;

CREATE UNIQUE INDEX "ModuleGrant_user_unique" ON "ModuleGrant" ("moduleId", "userId") WHERE "organizationId" IS NULL AND "userId" IS NOT NULL;
