-- Migration: adoption_timestamptz
-- Change: dashboard-adopcion (Fase 1 — Fundación)
--
-- Converts the adoption-relevant timestamp columns from TIMESTAMP(3) (without
-- time zone) to TIMESTAMPTZ(3). Existing values were written as UTC instants
-- (Prisma/Node serialize Date as UTC), so we reinterpret them with
-- `USING "<col>" AT TIME ZONE 'UTC'` — this PRESERVES the absolute instant.
--
-- OPERATIONAL RISK: `ALTER COLUMN ... TYPE` rewrites the whole table and takes
-- an ACCESS EXCLUSIVE lock for the duration, blocking reads and writes. On
-- large tables plan a maintenance window (or run on a replica / with a short
-- `statement_timeout`) before applying in production. PostgreSQL has NO
-- CONCURRENTLY form for a column type change, so this cannot be made online.
-- No backfill is required; values are preserved.
--
-- Rollback (manual, not shipped as a down migration):
--   ALTER TABLE "<table>"
--       ALTER COLUMN "<col>" TYPE TIMESTAMP(3) USING "<col>" AT TIME ZONE 'UTC';
-- (inverse reinterpretation; equally table-rewriting).

-- UserActivityLog.createdAt
ALTER TABLE "UserActivityLog"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- UserSession.startedAt / endedAt
ALTER TABLE "UserSession"
    ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE 'UTC';
ALTER TABLE "UserSession"
    ALTER COLUMN "endedAt" TYPE TIMESTAMPTZ(3) USING "endedAt" AT TIME ZONE 'UTC';

-- Patient.createdAt
ALTER TABLE "Patient"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- Anamnesis.updatedAt
ALTER TABLE "Anamnesis"
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- Anthropometry.date
ALTER TABLE "Anthropometry"
    ALTER COLUMN "date" TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC';

-- Consultation.createdAt / scheduledAt
ALTER TABLE "Consultation"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Consultation"
    ALTER COLUMN "scheduledAt" TYPE TIMESTAMPTZ(3) USING "scheduledAt" AT TIME ZONE 'UTC';

-- NutritionalPlan.createdAt
ALTER TABLE "NutritionalPlan"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
