import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";

import {
  EventCategory,
  RETENTION_DAYS,
} from "src/shared/event/event-taxonomy";

const DAY_MS = 24 * 60 * 60 * 1000;

interface RetentionCategoryReport {
  category: EventCategory;
  retentionDays: number;
  cutoff: string;
  purgeable: number;
  purged: number;
}

/**
 * Daily telemetry retention job (design D6).
 *
 * Phase 0 is DRY-RUN ONLY: it evaluates the per-category retention windows from
 * `EVENT_TAXONOMY` and records what WOULD be purged. The destructive purge is
 * intentionally NOT implemented in Phase 0 — `totalPurged` is always 0.
 *
 * Gated by `TELEMETRY_RETENTION_ENABLED` (default `false`): when disabled the
 * job skips entirely and writes no run-log row.
 */
@Injectable()
export class RetentionJobService {
  private readonly logger = new Logger(RetentionJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRetentionCron(): Promise<void> {
    if (!this.isRetentionEnabled()) {
      this.logger.log(
        "Retention job deshabilitado (TELEMETRY_RETENTION_ENABLED=false); se omite.",
      );
      return;
    }

    this.logger.log(
      "🔄 Iniciando tarea de retención de telemetría (DRY-RUN, no elimina filas)...",
    );

    const log = await this.prisma.telemetryRetentionJobLog.create({
      data: {
        startedAt: new Date(),
        dryRun: true,
        status: "RUNNING",
      },
    });

    try {
      const now = new Date();
      const reports: RetentionCategoryReport[] = [];
      let totalEvaluated = 0;

      for (const category of Object.values(EventCategory)) {
        const retentionDays = RETENTION_DAYS[category];
        const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);

        const purgeable = await this.prisma.userActivityLog.count({
          where: { category, createdAt: { lt: cutoff } },
        });

        totalEvaluated += purgeable;
        reports.push({
          category,
          retentionDays,
          cutoff: cutoff.toISOString(),
          purgeable,
          purged: 0,
        });
      }

      // DRY-RUN (Phase 0): no `deleteMany` call exists on purpose. Enabling the
      // destructive purge is a separate, explicitly-reviewed future change.
      await this.prisma.telemetryRetentionJobLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: "SUCCESS",
          totalEvaluated,
          totalPurged: 0,
          details: reports as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `✅ Retención (dry-run) finalizada. Filas purgables: ${totalEvaluated}, eliminadas: 0.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en la tarea de retención de telemetría: ${message}`);

      await this.prisma.telemetryRetentionJobLog
        .update({
          where: { id: log.id },
          data: {
            finishedAt: new Date(),
            status: "FAILED",
            details: { error: message },
          },
        })
        .catch(() => undefined);
    }
  }

  private isRetentionEnabled(): boolean {
    return (
      (this.config.get<string>("TELEMETRY_RETENTION_ENABLED") ?? "false")
        .trim()
        .toLowerCase() === "true"
    );
  }
}
