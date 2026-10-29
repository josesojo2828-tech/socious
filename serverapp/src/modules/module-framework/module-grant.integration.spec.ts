import type { Server } from "node:http";
import {
  CanActivate,
  Controller,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PrismaService } from "nestjs-prisma";
import request from "supertest";

import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import { ModuleController } from "./controllers/module.controller";
import { ModuleGrantService } from "./services/module-grant.service";
import { ModuleService } from "./services/module.service";

/**
 * Task 5.3 — module-grant HTTP integration.
 *
 * Boots a REAL Nest + Fastify pipeline with the real `ModuleController` /
 * `ModuleGrantService` / `ModuleService` over a MOCKED Prisma. A stub session
 * guard populates `request.user`, mirroring `SessionAuthGuard`.
 *
 * The repo has NO real test-DB harness (no testcontainers / dedicated test
 * database; the existing "integration" specs mock Prisma). Therefore the
 * DB-only guarantees — the raw partial unique indexes and the backfill
 * idempotency — are a DOCUMENTED GAP, not covered here. Covered here: grant
 * CRUD over HTTP, idempotent assign, cache invalidation and the flag gate.
 */

const CATALOG_MODULE = {
  id: "module-1",
  key: "ATTENDANCE_CONTROL",
  name: "Asistencia",
  active: true,
  scopes: ["TENANT", "ADMIN"],
  operatorPermit: null,
  icon: "calendar",
};

let currentUser: Record<string, unknown> = {
  id: "admin-1",
  permits: { name: "ADMIN", list: [] },
};

class StubSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = currentUser;
    return true;
  }
}

const makeGrant = (overrides: Record<string, unknown> = {}) => ({
  id: "grant-1",
  moduleId: "module-1",
  userId: "user-1",
  organizationId: null,
  source: "MANUAL",
  status: "ACTIVE",
  grantedAt: new Date("2026-06-01T00:00:00.000Z"),
  expiresAt: null,
  module: CATALOG_MODULE,
  ...overrides,
});

const prismaMock = {
  module: { findUnique: jest.fn(), findMany: jest.fn() },
  moduleGrant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  organizationMember: { findUnique: jest.fn() },
};

const entitlementsMock = {
  invalidate: jest.fn(),
  invalidateOrganization: jest.fn(),
};

describe("ModuleGrantController — HTTP integration", () => {
  let app: INestApplication;
  const ORIGINAL_FLAG = process.env.MODULE_FRAMEWORK_ENABLED;

  beforeAll(async () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "true";

    const moduleRef = await Test.createTestingModule({
      controllers: [ModuleController],
      providers: [
        ModuleService,
        ModuleGrantService,
        { provide: APP_GUARD, useClass: StubSessionGuard },
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntitlementService, useValue: entitlementsMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  const httpServer = (): Server => app.getHttpServer() as Server;

  afterAll(async () => {
    await app.close();
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.MODULE_FRAMEWORK_ENABLED;
    } else {
      process.env.MODULE_FRAMEWORK_ENABLED = ORIGINAL_FLAG;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODULE_FRAMEWORK_ENABLED = "true";
    currentUser = { id: "admin-1", permits: { name: "ADMIN", list: [] } };
    prismaMock.module.findUnique.mockResolvedValue(CATALOG_MODULE);
    prismaMock.module.findMany.mockResolvedValue([CATALOG_MODULE]);
    prismaMock.moduleGrant.findFirst.mockResolvedValue(null);
    prismaMock.moduleGrant.create.mockResolvedValue(makeGrant());
    prismaMock.moduleGrant.update.mockResolvedValue(
      makeGrant({ status: "ACTIVE" }),
    );
    prismaMock.moduleGrant.findUnique.mockResolvedValue(makeGrant());
    prismaMock.moduleGrant.findMany.mockResolvedValue([makeGrant()]);
    prismaMock.organizationMember.findUnique.mockResolvedValue(null);
  });

  it("creates a MANUAL personal grant for an admin", async () => {
    const res = await request(httpServer())
      .post("/api/modules/grants")
      .send({ moduleKey: "ATTENDANCE_CONTROL", userId: "user-1" });

    expect(res.status).toBe(201);
    expect(prismaMock.moduleGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleId: "module-1",
          userId: "user-1",
          organizationId: null,
          source: "MANUAL",
          grantedById: "admin-1",
        }),
      }),
    );
    expect(entitlementsMock.invalidate).toHaveBeenCalledWith("user-1", null);
  });

  it("reactivates an existing grant instead of duplicating it", async () => {
    prismaMock.moduleGrant.findFirst.mockResolvedValue(makeGrant());

    const res = await request(httpServer())
      .post("/api/modules/grants")
      .send({ moduleKey: "ATTENDANCE_CONTROL", userId: "user-1" });

    expect(res.status).toBe(201);
    expect(prismaMock.moduleGrant.create).not.toHaveBeenCalled();
    expect(prismaMock.moduleGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "grant-1" },
        data: expect.objectContaining({ status: "ACTIVE", source: "MANUAL" }),
      }),
    );
  });

  it("lists grants filtered by owner", async () => {
    const res = await request(httpServer()).get(
      "/api/modules/grants?userId=user-1",
    );

    expect(res.status).toBe(200);
    expect(prismaMock.moduleGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(res.body).toHaveLength(1);
  });

  it("revokes a grant (soft REVOKED) and invalidates the owner cache", async () => {
    const res = await request(httpServer()).delete("/api/modules/grants/grant-1");

    expect(res.status).toBe(200);
    expect(prismaMock.moduleGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "grant-1" },
        data: { status: "REVOKED" },
      }),
    );
    expect(entitlementsMock.invalidate).toHaveBeenCalledWith("user-1", null);
  });

  it("denies a non-admin non-member with 403", async () => {
    currentUser = { id: "nobody", permits: { name: "USER", list: [] } };

    const res = await request(httpServer())
      .post("/api/modules/grants")
      .send({ moduleKey: "ATTENDANCE_CONTROL", userId: "user-1" });

    expect(res.status).toBe(403);
    expect(prismaMock.moduleGrant.create).not.toHaveBeenCalled();
  });

  it("allows a CLINIC_ADMIN of the target organization", async () => {
    currentUser = { id: "clinic-admin", permits: { name: "USER", list: [] } };
    prismaMock.organizationMember.findUnique.mockResolvedValue({
      status: "ACTIVE",
      role: "CLINIC_ADMIN",
    });

    const res = await request(httpServer())
      .post("/api/modules/grants")
      .send({ moduleKey: "ATTENDANCE_CONTROL", organizationId: "org-1" });

    expect(res.status).toBe(201);
    expect(entitlementsMock.invalidateOrganization).toHaveBeenCalledWith(
      "org-1",
    );
  });

  it("returns the ACTIVE catalog from GET /api/modules (W1)", async () => {
    const res = await request(httpServer()).get("/api/modules");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([CATALOG_MODULE]);
    expect(prismaMock.module.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  });

  it("answers 404 when MODULE_FRAMEWORK_ENABLED is off (task 5.1)", async () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "false";

    const res = await request(httpServer()).get("/api/modules");

    expect(res.status).toBe(404);
    expect(prismaMock.module.findMany).not.toHaveBeenCalled();
  });
});
