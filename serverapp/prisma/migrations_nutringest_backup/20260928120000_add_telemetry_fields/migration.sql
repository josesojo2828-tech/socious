-- Telemetry foundation (Phase 1): additive nullable columns + relation + non-concurrent indexes.
-- NOTE: The two UserActivityLog indexes on (organizationId, createdAt) and
-- (organizationId, eventName) are intentionally created CONCURRENTLY in the
-- following migration (20260928120100_add_activity_telemetry_indexes_concurrently)
-- because CREATE INDEX CONCURRENTLY cannot run inside Prisma's migration transaction.

-- AlterTable
ALTER TABLE "UserActivityLog"
    ADD COLUMN "eventName" TEXT,
    ADD COLUMN "category" TEXT,
    ADD COLUMN "organizationId" TEXT,
    ADD COLUMN "source" TEXT,
    ADD COLUMN "eventVersion" TEXT;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_organizationId_startedAt_idx" ON "UserSession"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_idx" ON "Transaction"("organizationId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
