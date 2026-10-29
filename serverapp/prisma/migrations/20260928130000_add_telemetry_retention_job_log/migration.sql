-- Telemetry retention job observability log (Phase 5, task 5.3).
-- Mirrors the SubscriptionRenewalJobLog pattern: one row per run with totals
-- and per-category details. Phase 0 runs in DRY-RUN (dryRun = true, purge
-- disabled), so this table is purely additive and safe to deploy.

-- CreateTable
CREATE TABLE "TelemetryRetentionJobLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "totalEvaluated" INTEGER NOT NULL DEFAULT 0,
    "totalPurged" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryRetentionJobLog_pkey" PRIMARY KEY ("id")
);
