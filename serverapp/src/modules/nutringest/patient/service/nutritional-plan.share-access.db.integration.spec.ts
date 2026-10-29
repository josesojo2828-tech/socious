import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

// uuid resuelve a ESM puro (dist-node) que ts-jest no transforma en node_modules.
jest.mock("uuid", () => ({ v4: () => "00000000-0000-4000-8000-000000000000" }));

import { NutritionalPlanService } from "./nutritional-plan.service";

/**
 * S2 (legal-compliance) — DB-backed coverage for the shared-link access log.
 *
 * The access log was broken in production code while every unit test kept
 * passing: `schema.prisma` maps the field to the column `accessed_at`, but the
 * migration created `accessedAt`. Mocked Prisma cannot see a column-name
 * mismatch, so only a real PostgreSQL run exposes it — the write failed with
 * `column "accessed_at" of relation "shared_link_access" does not exist` and
 * every shared plan link returned a 500.
 *
 * These tests run inside an INTERACTIVE TRANSACTION that is ALWAYS rolled back,
 * so they exercise the real constraints without mutating the local database.
 * When no `DATABASE_URL` is present the whole suite is skipped, keeping the
 * default `npm test` run green on machines without the local DB.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const prisma = hasDb ? new PrismaClient() : (null as unknown as PrismaClient);

class RollbackSignal extends Error {}

async function inRollback<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx);
      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) throw error;
  }
  return result as T;
}

function service(tx: Prisma.TransactionClient) {
  return new NutritionalPlanService(
    {} as never, // eventEmitter — unused by the shared-token path
    {} as never, // planRepository — unused by the shared-token path
    tx as never, // prisma
    {} as never, // i18n
    {} as never, // logger
    {} as never, // workspaceContext
  );
}

async function seedSharedPlan(tx: Prisma.TransactionClient) {
  const permit = await tx.permit.create({
    data: { name: `NUTRITIONIST_${Date.now()}`, list: [] },
  });

  const user = await tx.user.create({
    data: {
      email: `share-access-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
      firstName: "Test",
      lastName: "Nutricionista",
      permitId: permit.id,
    },
  });

  const patient = await tx.patient.create({
    data: {
      firstName: "Paciente",
      lastName: "Prueba",
      gender: "OTHER",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      userId: user.id,
    },
  });

  const shareToken = `token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const plan = await tx.nutritionalPlan.create({
    data: {
      patientId: patient.id,
      name: "Plan compartido",
      kcalTarget: 2000,
      proteinTarget: 100,
      carbsTarget: 200,
      fatsTarget: 70,
      isShared: true,
      shareToken,
    },
  });

  return { plan, shareToken };
}

describeDb("NutritionalPlanService — shared link access log (DB-backed)", () => {
  it("stores the access row in the column the model maps to", async () => {
    const { plan, shareToken } = await inRollback(async (tx) => {
      const seeded = await seedSharedPlan(tx);

      const shared = await service(tx).findByShareToken(seeded.shareToken);
      expect(shared.id).toBe(seeded.plan.id);

      const rows = await tx.sharedLinkAccess.findMany({
        where: { nutritionalPlanId: seeded.plan.id },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].accessedAt).toBeInstanceOf(Date);

      // The physical column must be the mapped one. A migration that creates
      // "accessedAt" instead of "accessed_at" passes every mocked test and
      // breaks every real write.
      const columns = await tx.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'shared_link_access'
          AND column_name IN ('accessed_at', 'accessedAt')
      `;

      expect(columns.map((c) => c.column_name)).toEqual(["accessed_at"]);

      return seeded;
    });

    expect(plan.isShared).toBe(true);
  });

  it("rejects an expired shared token without writing an access row", async () => {
    await inRollback(async (tx) => {
      const { plan, shareToken } = await seedSharedPlan(tx);

      await tx.nutritionalPlan.update({
        where: { id: plan.id },
        data: { shareTokenExpiresAt: new Date(Date.now() - 1000) },
      });

      await expect(service(tx).findByShareToken(shareToken)).rejects.toThrow(
        "Este enlace ha expirado o no existe.",
      );

      const rows = await tx.sharedLinkAccess.count({
        where: { nutritionalPlanId: plan.id },
      });
      expect(rows).toBe(0);
    });
  });

  it("rejects a revoked shared token without writing an access row", async () => {
    await inRollback(async (tx) => {
      const { plan, shareToken } = await seedSharedPlan(tx);

      // Mirrors revokeShareToken(): the token stops serving immediately.
      await tx.nutritionalPlan.update({
        where: { id: plan.id },
        data: {
          isShared: false,
          shareToken: null,
          shareTokenExpiresAt: null,
          shareTokenRevokedAt: new Date(),
        },
      });

      await expect(service(tx).findByShareToken(shareToken)).rejects.toThrow(
        "Este enlace ha expirado o no existe.",
      );

      const rows = await tx.sharedLinkAccess.count({
        where: { nutritionalPlanId: plan.id },
      });
      expect(rows).toBe(0);
    });
  });
});
