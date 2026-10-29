import "dotenv/config";
import type { Server } from "node:http";
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
} from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PrismaService } from "nestjs-prisma";
import request from "supertest";

import { FieldPolicy } from "./field-policy.decorator";
import { FieldPolicyInterceptor } from "./field-policy.interceptor";
import { FieldPolicyService } from "./field-policy.service";

/**
 * HTTP integration for the server-driven field policy.
 *
 * Boots a REAL Nest + Fastify pipeline with the real `FieldPolicyInterceptor`
 * (as an `APP_INTERCEPTOR`, exactly like `app.module.ts`) and the real
 * `FieldPolicyService` over a mocked Prisma. A stub session guard populates
 * `request.user` with organization memberships, mirroring `SessionAuthGuard`.
 *
 * Proves, on a representative payload: restricted fields are OMITTED for the
 * restricted role, unrestricted fields stay visible, the default (no policy)
 * keeps every field, and different roles see different fields.
 */

const HIDDEN_BY_ROLE: Record<string, string[]> = {
  RECEPTIONIST: ["notes", "reason"],
  CLINIC_MANAGER: ["notes"],
  NUTRITIONIST: [],
};

let currentUser: Record<string, unknown> = { id: "user-1" };

@Controller("probe")
class ProbeController {
  @Get("agenda/:orgId")
  @FieldPolicy("ATTENDANCE_CONTROL", {
    formKey: "attendance.agenda",
    organizationParam: "orgId",
  })
  agenda() {
    return {
      records: [
        {
          id: "a1",
          scheduledAt: "2026-01-01T10:00:00.000Z",
          notes: "secret",
          reason: "clinical",
          status: "NEW",
        },
      ],
      summary: { total: 1 },
    };
  }

  @Get("open")
  open() {
    return { records: [{ id: "a1", notes: "secret" }] };
  }
}

class StubSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = currentUser;
    return true;
  }
}

const prismaMock = {
  organizationMember: { findUnique: jest.fn() },
  fieldPolicy: {
    findMany: jest.fn(({ where }: { where: { role: string } }) =>
      Promise.resolve(
        (HIDDEN_BY_ROLE[where.role] ?? []).map((fieldKey) => ({ fieldKey })),
      ),
    ),
  },
};

const membership = (role: string) => ({
  id: "user-1",
  organizationMembers: [{ organizationId: "org-a", role, status: "ACTIVE" }],
});

describe("FieldPolicyInterceptor — HTTP integration", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ENTITLEMENTS_ENABLED = "true";

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        { provide: APP_GUARD, useClass: StubSessionGuard },
        { provide: APP_INTERCEPTOR, useClass: FieldPolicyInterceptor },
        FieldPolicyService,
        { provide: PrismaService, useValue: prismaMock },
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
    delete process.env.ENTITLEMENTS_ENABLED;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { id: "user-1" };
    process.env.ENTITLEMENTS_ENABLED = "true";
  });

  it("omits restricted fields for the restricted role", async () => {
    currentUser = membership("RECEPTIONIST");

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.status).toBe(200);
    expect(res.body.records[0]).toEqual({
      id: "a1",
      scheduledAt: "2026-01-01T10:00:00.000Z",
      status: "NEW",
    });
    expect(res.body.records[0]).not.toHaveProperty("notes");
    expect(res.body.records[0]).not.toHaveProperty("reason");
  });

  it("keeps unrestricted fields and unrelated payload untouched", async () => {
    currentUser = membership("RECEPTIONIST");

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.body.records[0]).toHaveProperty("status", "NEW");
    expect(res.body.summary).toEqual({ total: 1 });
  });

  it("defaults to all fields visible when the role has no policy", async () => {
    currentUser = membership("NUTRITIONIST");

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.body.records[0]).toEqual({
      id: "a1",
      scheduledAt: "2026-01-01T10:00:00.000Z",
      notes: "secret",
      reason: "clinical",
      status: "NEW",
    });
  });

  it("lets different roles see different fields", async () => {
    currentUser = membership("CLINIC_MANAGER");

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.body.records[0]).not.toHaveProperty("notes");
    expect(res.body.records[0]).toHaveProperty("reason", "clinical");
  });

  it("defaults to all visible when the caller has no active membership", async () => {
    currentUser = { id: "user-1", organizationMembers: [] };

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.body.records[0]).toHaveProperty("notes", "secret");
    expect(res.body.records[0]).toHaveProperty("reason", "clinical");
  });

  it("scopes the policy query to the module and form", async () => {
    currentUser = membership("RECEPTIONIST");

    await request(httpServer()).get("/probe/agenda/org-a");

    expect(prismaMock.fieldPolicy.findMany).toHaveBeenCalledWith({
      where: {
        moduleKey: "ATTENDANCE_CONTROL",
        role: "RECEPTIONIST",
        access: "HIDDEN",
        formKey: "attendance.agenda",
      },
      select: { fieldKey: true },
    });
  });

  it("never filters undecorated routes", async () => {
    currentUser = membership("RECEPTIONIST");

    const res = await request(httpServer()).get("/probe/open");

    expect(res.body.records[0]).toEqual({ id: "a1", notes: "secret" });
    expect(prismaMock.fieldPolicy.findMany).not.toHaveBeenCalled();
  });

  it("is a no-op when the feature flag is off", async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    currentUser = membership("RECEPTIONIST");

    const res = await request(httpServer()).get("/probe/agenda/org-a");

    expect(res.body.records[0]).toHaveProperty("notes", "secret");
    expect(prismaMock.fieldPolicy.findMany).not.toHaveBeenCalled();
  });
});
