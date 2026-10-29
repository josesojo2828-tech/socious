import { Logger } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";

const logger = new Logger("FinancialAudit");

export interface FinancialAuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  amount?: number | string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Registra una operación financiera en la tabla de auditoría.
 * Nunca debe romper la operación de negocio: los errores sólo se loguean.
 */
export async function writeFinancialAudit(
  prisma: PrismaService,
  entry: FinancialAuditEntry,
): Promise<void> {
  try {
    await prisma.financialAuditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId ?? null,
        amount: entry.amount ?? null,
        metadata: entry.metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.error("Error escribiendo auditoría financiera", error as any);
  }
}
