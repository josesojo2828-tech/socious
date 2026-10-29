-- Telemetry foundation (Phase 1): indexes on UserActivityLog.
--
-- IMPORTANT: do NOT use CREATE INDEX CONCURRENTLY in this migration.
-- Prisma Migrate wraps every migration in a single transaction, and PostgreSQL
-- rejects CREATE INDEX CONCURRENTLY inside a transaction block
-- (SQLSTATE 25001). That is exactly what failed in production (P3018), leaving
-- the migration in a failed state and blocking every later migration.
--
-- These indexes are therefore built with a plain, transactional CREATE INDEX.
-- A plain build takes an ACCESS EXCLUSIVE lock on "UserActivityLog" for its
-- duration, which is safe here: the table is new/small and the telemetry
-- columns were never populated before this change (all pre-existing rows have
-- NULL "organizationId"/"eventName"), so the build is fast.
--
-- IF NOT EXISTS keeps the migration idempotent (safe to re-run if a partial
-- index survived a previous attempt).
--
-- PostgreSQL offers no transactional alternative to CONCURRENTLY. If this table
-- ever grows large, move index maintenance OUTSIDE Prisma Migrate (e.g.
-- `prisma db execute` without a transaction, then `migrate resolve --applied`).

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivityLog_organizationId_createdAt_idx" ON "UserActivityLog"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivityLog_organizationId_eventName_idx" ON "UserActivityLog"("organizationId", "eventName");
