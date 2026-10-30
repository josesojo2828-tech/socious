import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";

export type SequenceScope = "SALE" | "ORDER" | "PURCHASE" | "RETURN";

/** Tenant key used when the document has no organization (personal context). */
export const GLOBAL_TENANT_KEY = "GLOBAL";

/**
 * Minimal Prisma surface the service needs. It accepts both the root client and
 * a `$transaction` callback client, so numbering can join the same transaction
 * as the document it numbers (a rolled-back sale must not burn a number).
 */
export type SequenceDb = Pick<Prisma.TransactionClient, "counter">;

/**
 * Atomic per-tenant document numbering (`VTA-00001`, `PED-00001`, `COM-00001`).
 *
 * The increment is a single native `INSERT ... ON CONFLICT DO UPDATE SET
 * value = value + 1 RETURNING value`, so concurrent sales in the same tenant
 * can never receive the same number.
 */
@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(
    scope: SequenceScope,
    organizationId: string | null | undefined,
    db: SequenceDb = this.prisma,
  ): Promise<number> {
    const tenantKey = organizationId || GLOBAL_TENANT_KEY;

    const row = await db.counter.upsert({
      where: { tenantKey_scope: { tenantKey, scope } },
      create: { tenantKey, scope, value: 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    });

    return row.value;
  }

  async nextFormatted(
    scope: SequenceScope,
    organizationId: string | null | undefined,
    prefix: string,
    width = 5,
    db: SequenceDb = this.prisma,
  ): Promise<string> {
    const value = await this.next(scope, organizationId, db);
    return `${prefix}-${String(value).padStart(width, "0")}`;
  }
}
