import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import { EntitlementAdminService } from "./entitlement-admin.service";

/**
 * Phase 6.1 / 6.2 — DB-backed integration coverage.
 *
 * Every test runs inside an INTERACTIVE TRANSACTION that is ALWAYS rolled back
 * (a sentinel error is thrown after the assertions). This exercises the REAL
 * PostgreSQL constraints — the partial unique indexes and the owner XOR CHECK
 * that Prisma cannot express — without mutating the shared local database.
 *
 * When no `DATABASE_URL` is present the whole suite is skipped, so the default
 * `npm test` run stays green on machines without the local DB.
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

function errorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

function randomKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Own fixtures for the workspace-scoped tests.
 *
 * The entitlement service resolves the effective organization through
 * `OrganizationScopeService` (S6): a requested organization is honored ONLY
 * when the caller holds an ACTIVE `OrganizationMember` row there; anything
 * else degrades to the personal context. A suite that picks "whatever the
 * shared dev database happens to contain" therefore depends on data this
 * spec does not own — the first `User` in the database has no ACTIVE
 * membership, so the requested organization silently degrades to personal and
 * the expected grant is never resolved.
 *
 * These fixtures are created INSIDE the rolled-back transaction, so the suite
 * keeps its "never leave data behind" discipline.
 */
interface WorkspaceFixtures {
  /** Organization the caller belongs to (the workspace under test). */
  org: { id: string };
  /** A second organization the caller does NOT belong to (foreign workspace). */
  otherOrg: { id: string };
  /** The caller: an ACTIVE member of `org` only. */
  user: { id: string };
}

async function createWorkspaceFixtures(
  tx: Prisma.TransactionClient,
): Promise<WorkspaceFixtures> {
  const permit = await tx.permit.create({
    data: { name: randomKey("TEST_PERMIT"), list: [] },
  });
  const user = await tx.user.create({
    data: {
      email: `${randomKey("test-user")}@example.test`,
      permitId: permit.id,
      firstName: "Test",
      lastName: "Member",
    },
  });
  const org = await tx.organization.create({
    data: { name: randomKey("TEST_ORG_A") },
  });
  const otherOrg = await tx.organization.create({
    data: { name: randomKey("TEST_ORG_B") },
  });
  await tx.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      status: "ACTIVE",
    },
  });

  return { org, otherOrg, user };
}

function stubCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidateUser: jest.fn().mockResolvedValue(undefined),
    invalidateOrganization: jest.fn().mockResolvedValue(undefined),
  };
}

describeDb(
  "Module entitlements — DB integration (rolled-back transactions)",
  () => {
    let orgId: string;
    let userId: string;
    let addonId: string;

    beforeAll(async () => {
      const [org, user, addon] = await Promise.all([
        prisma.organization.findFirst({ select: { id: true } }),
        prisma.user.findFirst({ select: { id: true } }),
        prisma.addOn.findFirst({
          where: { active: true },
          select: { id: true },
        }),
      ]);

      if (!org || !user || !addon) {
        throw new Error(
          "Integration fixtures missing: need at least one Organization, User and active AddOn.",
        );
      }
      orgId = org.id;
      userId = user.id;
      addonId = addon.id;
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    describe("partial-index dedupe (Entitlement)", () => {
      it("rejects a duplicate ORG entitlement via entitlement_org_unique", async () => {
        const code = await inRollback(async (tx) => {
          const addon = await tx.addOn.create({
            data: { key: randomKey("TEST_DEDUP"), name: "dedupe", price: 1 },
          });
          await tx.entitlement.create({
            data: {
              organizationId: orgId,
              addOnId: addon.id,
              priceAtPurchase: 1,
            },
          });
          try {
            await tx.entitlement.create({
              data: {
                organizationId: orgId,
                addOnId: addon.id,
                priceAtPurchase: 1,
              },
            });
            return undefined;
          } catch (error) {
            return errorCode(error);
          }
        });

        expect(code).toBe("P2002");
      });

      it("rejects a duplicate PERSONAL entitlement via entitlement_user_unique", async () => {
        const code = await inRollback(async (tx) => {
          const addon = await tx.addOn.create({
            data: { key: randomKey("TEST_DEDUP"), name: "dedupe", price: 1 },
          });
          await tx.entitlement.create({
            data: { userId, addOnId: addon.id, priceAtPurchase: 1 },
          });
          try {
            await tx.entitlement.create({
              data: { userId, addOnId: addon.id, priceAtPurchase: 1 },
            });
            return undefined;
          } catch (error) {
            return errorCode(error);
          }
        });

        expect(code).toBe("P2002");
      });

      it("keeps org and personal entitlements for the same add-on independent", async () => {
        const count = await inRollback(async (tx) => {
          const addon = await tx.addOn.create({
            data: { key: randomKey("TEST_BOTH"), name: "both", price: 1 },
          });
          await tx.entitlement.create({
            data: {
              organizationId: orgId,
              addOnId: addon.id,
              priceAtPurchase: 1,
            },
          });
          await tx.entitlement.create({
            data: { userId, addOnId: addon.id, priceAtPurchase: 1 },
          });
          return tx.entitlement.count({ where: { addOnId: addon.id } });
        });

        expect(count).toBe(2);
      });

      it("rejects an entitlement with no owner via Entitlement_owner_xor_check", async () => {
        const message = await inRollback(async (tx) => {
          try {
            await tx.entitlement.create({
              data: { addOnId: addonId, priceAtPurchase: 1 },
            });
            return undefined;
          } catch (error) {
            return (error as Error).message;
          }
        });

        expect(message).toMatch(/owner_xor_check/);
      });
    });

    describe("cross-tenant invisibility (real EntitlementService)", () => {
      it("never leaks org A entitlements into another workspace or personal context", async () => {
        const grantKey = randomKey("GRANT");

        const outcome = await inRollback(async (tx) => {
          // Own fixtures: the caller must be an ACTIVE member of the requested
          // organization, otherwise the scope degrades to the personal context
          // and the org grant is never resolved.
          const fixtures = await createWorkspaceFixtures(tx);
          const addon = await tx.addOn.create({
            data: {
              key: randomKey("TEST_ISO"),
              name: "iso",
              price: 1,
              grants: [grantKey],
              modules: [grantKey],
            },
          });
          await tx.entitlement.create({
            data: {
              organizationId: fixtures.org.id,
              addOnId: addon.id,
              priceAtPurchase: 1,
            },
          });

          const service = new EntitlementService(
            tx as unknown as never,
            { findOne: jest.fn() } as never,
            stubCache() as never,
          );
          const user = {
            id: fixtures.user.id,
            permits: { list: [] },
            userPermissions: [],
            subscriptions: [],
          };

          const [inOrg, inOther, personal] = await Promise.all([
            service.resolve(fixtures.user.id, fixtures.org.id, user),
            // A real organization the caller does not belong to.
            service.resolve(fixtures.user.id, fixtures.otherOrg.id, user),
            service.resolve(fixtures.user.id, null, user),
          ]);

          return {
            inOrg: inOrg.permissions,
            inOther: inOther.permissions,
            personal: personal.permissions,
          };
        });

        expect(outcome.inOrg).toContain(grantKey);
        expect(outcome.inOther).not.toContain(grantKey);
        expect(outcome.personal).not.toContain(grantKey);
      });
    });

    describe("UserPermission org-scoping + backfill", () => {
      it("rejects a duplicate GLOBAL grant via user_permission_global_unique", async () => {
        const code = await inRollback(async (tx) => {
          const permission = randomKey("TEST_GLOBAL");
          await tx.userPermission.create({
            data: { userId, organizationId: null, permission },
          });
          try {
            await tx.userPermission.create({
              data: { userId, organizationId: null, permission },
            });
            return undefined;
          } catch (error) {
            return errorCode(error);
          }
        });

        expect(code).toBe("P2002");
      });

      it("rejects a duplicate ORG-scoped grant via the widened composite unique", async () => {
        const code = await inRollback(async (tx) => {
          const permission = randomKey("TEST_ORG");
          await tx.userPermission.create({
            data: { userId, organizationId: orgId, permission },
          });
          try {
            await tx.userPermission.create({
              data: { userId, organizationId: orgId, permission },
            });
            return undefined;
          } catch (error) {
            return errorCode(error);
          }
        });

        expect(code).toBe("P2002");
      });

      it("leaves existing rows backfilled to organization_id = NULL with no duplicates", async () => {
        const duplicates = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT user_id, permission, count(*)::int AS count
        FROM user_permission
        WHERE organization_id IS NULL
        GROUP BY user_id, permission
        HAVING count(*) > 1
      `;

        expect(duplicates).toHaveLength(0);
      });

      it("documents the backfill + partial index in the migration SQL", () => {
        const sql = readFileSync(
          join(
            process.cwd(),
            "prisma",
            "migrations",
            "20260930_add_module_entitlements",
            "migration.sql",
          ),
          "utf8",
        );

        expect(sql).toMatch(/ADD COLUMN\s+"organization_id" TEXT/i);
        expect(sql).toMatch(
          /CREATE UNIQUE INDEX "user_permission_global_unique"[\s\S]*WHERE "organization_id" IS NULL/i,
        );
        expect(sql).toMatch(
          /UPDATE "user_permission" SET "organization_id" = NULL/i,
        );
      });
    });

    describe("add-on toggle + monthly invoice idempotency (6.2)", () => {
      it("enabling an add-on makes its module visible; disabling cuts it", async () => {
        const grantKey = randomKey("TOGGLE");

        const outcome = await inRollback(async (tx) => {
          // Own fixtures: the resolution is workspace-scoped, so the caller
          // needs an ACTIVE membership in the organization under test.
          const fixtures = await createWorkspaceFixtures(tx);
          const addon = await tx.addOn.create({
            data: {
              key: randomKey("TEST_TOGGLE"),
              name: "toggle",
              price: 10,
              grants: [grantKey],
              modules: [grantKey],
            },
          });

          const service = new EntitlementService(
            tx as unknown as never,
            { findOne: jest.fn() } as never,
            stubCache() as never,
          );
          const admin = new EntitlementAdminService(
            tx as unknown as never,
            service,
          );
          const user = {
            id: fixtures.user.id,
            permits: { list: [] },
            userPermissions: [],
            subscriptions: [],
          };

          const entitlement = await admin.enableForOrganization(
            fixtures.org.id,
            {
              addOnId: addon.id,
            },
          );
          const afterEnable = await service.resolve(
            fixtures.user.id,
            fixtures.org.id,
            user,
          );

          await admin.disableForOrganization(fixtures.org.id, entitlement.id);
          const afterDisable = await service.resolve(
            fixtures.user.id,
            fixtures.org.id,
            user,
          );

          return {
            enablePermissions: afterEnable.permissions,
            enableModules: afterEnable.modules.map((module) => module.key),
            disablePermissions: afterDisable.permissions,
            disableModules: afterDisable.modules.map((module) => module.key),
          };
        });

        expect(outcome.enablePermissions).toContain(grantKey);
        expect(outcome.enableModules).toContain(grantKey);
        expect(outcome.disablePermissions).not.toContain(grantKey);
        expect(outcome.disableModules).not.toContain(grantKey);
      });

      it("rejects a duplicate monthly invoice for the same org + period", async () => {
        const code = await inRollback(async (tx) => {
          // Own organization: the idempotency constraint is per organization
          // + period, so the shared dev database must not decide the outcome.
          const fixtures = await createWorkspaceFixtures(tx);
          const periodStart = new Date("1990-01-01T00:00:00.000Z");
          const data = {
            organizationId: fixtures.org.id,
            periodStart,
            periodEnd: new Date("1990-02-01T00:00:00.000Z"),
            subtotal: 1,
            total: 1,
            dueDate: new Date("1990-01-31T00:00:00.000Z"),
          };

          await tx.invoice.create({ data });
          try {
            await tx.invoice.create({ data });
            return undefined;
          } catch (error) {
            return errorCode(error);
          }
        });

        expect(code).toBe("P2002");
      });
    });
  },
);
