import type { Server } from "node:http";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import request from "supertest";

import { ModuleDashboardController } from "../src/modules/module-framework/dashboard/module-dashboard.controller";
import { ModuleDashboardRegistry } from "../src/modules/module-framework/dashboard/module-dashboard.registry";
import { ModuleFrameworkEnabledGuard } from "../src/modules/module-framework/guards/module-framework-enabled.guard";
import { ModuleService } from "../src/modules/module-framework/services/module.service";
import { DashboardService } from "../src/modules/dashboard/dashboard.service";
import { buildSidebarSections } from "../src/modules/dashboard/sidebar.helper";
import { WorkspaceContextService } from "../src/shared/services/workspace-context.service";
import PermitModel from "../src/modules/permit/model/permit.model";

/**
 * Task 5.4 — module-framework E2E.
 *
 * The repo's e2e specs are HTTP-level for the API but have NO real test DB, so
 * this boots a REAL Nest + Fastify pipeline for `ModuleDashboardController`
 * over a mocked catalog + a real provider registry, and exercises the sidebar
 * through the shared `buildSidebarSections` build site.
 *
 * Covered: per-scope dashboard, the Phase 4 ADMIN-scope hardening, OPERATOR
 * gating, the flag gate, admin grouped sidebar and non-admin gating.
 */

const TENANT_MODULE = {
  id: "module-m",
  key: "M",
  name: "Módulo M",
  active: true,
  scopes: ["TENANT", "ADMIN", "OPERATOR"],
  operatorPermit: "MARKETING",
  icon: "grid",
};

const NO_PROVIDER_MODULE = {
  ...TENANT_MODULE,
  id: "module-noprov",
  key: "NOPROV",
};

let currentUser: Record<string, unknown> = {
  id: "user-1",
  permits: { name: "USER", list: [] },
};

class StubSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = currentUser;
    return true;
  }
}

const modulesMock = { findByKey: jest.fn() };

describe("Module Framework — E2E", () => {
  let app: INestApplication;
  const ORIGINAL_FLAG = process.env.MODULE_FRAMEWORK_ENABLED;

  beforeAll(async () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "true";

    const registry = new ModuleDashboardRegistry();
    registry.register({
      moduleKey: "M",
      load: async (context) => ({
        moduleKey: context.moduleKey,
        scope: context.scope,
        kind: "ANALYTICS",
        data: { organizationId: context.organizationId },
      }),
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ModuleDashboardController],
      providers: [
        ModuleFrameworkEnabledGuard,
        { provide: APP_GUARD, useClass: StubSessionGuard },
        { provide: ModuleService, useValue: modulesMock },
        { provide: ModuleDashboardRegistry, useValue: registry },
        WorkspaceContextService,
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
    currentUser = { id: "user-1", permits: { name: "USER", list: [] } };
    modulesMock.findByKey.mockImplementation((key: string) => {
      if (key === TENANT_MODULE.key) return Promise.resolve(TENANT_MODULE);
      if (key === NO_PROVIDER_MODULE.key)
        return Promise.resolve(NO_PROVIDER_MODULE);
      return Promise.resolve(null);
    });
  });

  describe("GET /api/modules/:key/dashboard — per scope", () => {
    it("serves the TENANT scope to any authenticated user", async () => {
      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=TENANT",
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ moduleKey: "M", scope: "TENANT" });
    });

    it("denies scope=ADMIN to a non-admin (Phase 4 hardening)", async () => {
      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=ADMIN",
      );

      expect(res.status).toBe(403);
    });

    it("serves scope=ADMIN to a global admin", async () => {
      currentUser = { id: "admin-1", permits: { name: "ADMIN", list: [] } };

      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=ADMIN",
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ scope: "ADMIN" });
    });

    it("serves scope=ADMIN to a SUPERADMIN", async () => {
      currentUser = { id: "root", permits: { name: "SUPERADMIN", list: [] } };

      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=ADMIN",
      );

      expect(res.status).toBe(200);
    });

    it("denies scope=OPERATOR without the operator permit", async () => {
      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=OPERATOR",
      );

      expect(res.status).toBe(403);
    });

    it("serves scope=OPERATOR to a permit holder", async () => {
      currentUser = {
        id: "marketing-1",
        permits: { name: "USER", list: ["MARKETING"] },
      };

      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=OPERATOR",
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ scope: "OPERATOR" });
    });

    it("404s an unknown module", async () => {
      const res = await request(httpServer()).get(
        "/api/modules/UNKNOWN/dashboard",
      );

      expect(res.status).toBe(404);
    });

    it("404s a module without a registered provider", async () => {
      const res = await request(httpServer()).get(
        "/api/modules/NOPROV/dashboard?scope=TENANT",
      );

      expect(res.status).toBe(404);
    });

    it("404s every route when the flag is off (task 5.1)", async () => {
      process.env.MODULE_FRAMEWORK_ENABLED = "false";

      const res = await request(httpServer()).get(
        "/api/modules/M/dashboard?scope=TENANT",
      );

      expect(res.status).toBe(404);
    });
  });

  describe("sidebar — admin grouped section & non-admin gating", () => {
    const makeDashboardService = (
      activeModules: { key: string; name: string; icon: string | null }[] = [],
    ) =>
      new DashboardService({} as never, new PermitModel() as never, {
        listActive: async () => activeModules,
      } as never);

    it("renders ONE grouped modules section for admins", async () => {
      const sections = await buildSidebarSections(
        makeDashboardService([
          { key: "M", name: "Módulo M", icon: "grid" },
        ]),
        {
          id: "admin-1",
          permits: { name: "ADMIN", list: ["PERMIT_DASHBOARD"] },
        },
      );

      const moduleSections = sections.filter(
        (section) => section.title === "common.sidebar.modules",
      );
      expect(moduleSections).toHaveLength(1);
      expect(moduleSections[0].items[0].link).toBe(
        "/dashboard/admin/modules/M",
      );
    });

    it("gates non-admin module items by the resolved modules", async () => {
      const sections = await buildSidebarSections(
        makeDashboardService(),
        { id: "user-1", permits: { name: "USER", list: [] } },
        { permissions: ["PERMIT_DASHBOARD"], modules: [] },
      );

      const links = sections.flatMap((s) => s.items.map((i) => i.link));
      expect(links).not.toContain("/dashboard/portfolio");
      expect(links).not.toContain("/dashboard/community");
    });
  });
});
