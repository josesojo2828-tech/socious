import "dotenv/config";
import type { Server } from "node:http";
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import request from "supertest";

import { RequireEntitlement } from "../require-entitlement.decorator";
import { EntitlementGuard } from "./entitlement.guard";
import { EntitlementService } from "../service/entitlement.service";
import type { ResolvedEntitlements } from "../service/entitlement-resolver";

/**
 * Phase 6.1 — HTTP integration for the global entitlement gate.
 *
 * Boots a REAL Nest + Fastify pipeline with the actual `EntitlementGuard`
 * registered as a second `APP_GUARD` (exactly like `auth.module.ts`). A stub
 * session guard populates `request.user`, mirroring `SessionAuthGuard`. This
 * proves the denial surfaces as a 403 with code `ENTITLEMENT_REQUIRED` through
 * the real exception filter — not just at the guard unit level.
 */

const resolveMock = jest.fn<Promise<ResolvedEntitlements>, unknown[]>();

const resolvedWith = (permissions: string[]): ResolvedEntitlements => ({
  permissions,
  modules: [],
  fieldPolicies: {},
  organizationId: null,
});

let currentUser: {
  id?: string;
  entitlements?: ResolvedEntitlements;
} = { id: "user-1" };

@Controller("probe")
class ProbeController {
  @Get("attendance")
  @RequireEntitlement("ATTENDANCE_CONTROL")
  attendance() {
    return { ok: true };
  }

  @Get("open")
  open() {
    return { ok: true };
  }
}

class StubSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = currentUser;
    return true;
  }
}

describe("EntitlementGuard — HTTP integration (403 ENTITLEMENT_REQUIRED)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ENTITLEMENTS_ENABLED = "true";

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        { provide: APP_GUARD, useClass: StubSessionGuard },
        { provide: APP_GUARD, useClass: EntitlementGuard },
        { provide: EntitlementService, useValue: { resolve: resolveMock } },
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
    resolveMock.mockReset();
    currentUser = { id: "user-1" };
    process.env.ENTITLEMENTS_ENABLED = "true";
  });

  it("denies a decorated route with 403 and code ENTITLEMENT_REQUIRED", async () => {
    resolveMock.mockResolvedValue(resolvedWith([]));

    const res = await request(httpServer()).get("/probe/attendance");

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      code: "ENTITLEMENT_REQUIRED",
      entitlement: "ATTENDANCE_CONTROL",
    });
    expect(resolveMock).toHaveBeenCalledWith("user-1", null);
  });

  it("allows a decorated route when the caller holds the entitlement", async () => {
    resolveMock.mockResolvedValue(resolvedWith(["ATTENDANCE_CONTROL"]));

    const res = await request(httpServer()).get("/probe/attendance");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("never blocks an undecorated route", async () => {
    resolveMock.mockResolvedValue(resolvedWith([]));

    const res = await request(httpServer()).get("/probe/open");

    expect(res.status).toBe(200);
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the feature flag is off", async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    resolveMock.mockResolvedValue(resolvedWith([]));

    const res = await request(httpServer()).get("/probe/attendance");

    expect(res.status).toBe(200);
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it("resolves in the workspace supplied via X-Workspace-Id", async () => {
    resolveMock.mockResolvedValue(resolvedWith(["ATTENDANCE_CONTROL"]));

    const res = await request(httpServer())
      .get("/probe/attendance")
      .set("x-workspace-id", "org-a");

    expect(res.status).toBe(200);
    expect(resolveMock).toHaveBeenCalledWith("user-1", "org-a");
  });

  it("reuses entitlements preloaded on request.user without re-resolving", async () => {
    currentUser = {
      id: "user-1",
      entitlements: resolvedWith(["ATTENDANCE_CONTROL"]),
    };

    const res = await request(httpServer()).get("/probe/attendance");

    expect(res.status).toBe(200);
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it("denies when there is no authenticated user", async () => {
    currentUser = {};

    const res = await request(httpServer()).get("/probe/attendance");

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: "ENTITLEMENT_REQUIRED" });
    expect(resolveMock).not.toHaveBeenCalled();
  });
});
