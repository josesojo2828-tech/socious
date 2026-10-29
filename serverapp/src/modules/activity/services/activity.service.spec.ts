import { ActivityService } from "./activity.service";
import { hashIp, PII_HASH_SALT_ENV } from "src/shared/event/pii";
import { EventCategory } from "src/shared/event/event-taxonomy";

/**
 * Phase 7 (task 7.1/7.2) — real ActivityService: PII minimization at the write
 * boundary, org resolution and pagination/active-user primitives.
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent),
 * so this spec is authored but not executed in this phase.
 */
const makeService = (opts?: { workspaceId?: string | null; salt?: string }) => {
  const repo = {
    create: jest.fn().mockResolvedValue(undefined),
    findByOrganization: jest.fn().mockResolvedValue([]),
    findGlobal: jest.fn().mockResolvedValue([]),
    getStatsByOrganization: jest.fn().mockResolvedValue({}),
    getGlobalStats: jest.fn().mockResolvedValue({}),
    countDistinctActiveUsersInOrganization: jest.fn().mockResolvedValue(0),
  };
  const workspaceContext = {
    getWorkspaceId: jest.fn().mockReturnValue(opts?.workspaceId ?? null),
  };
  const config = {
    get: jest.fn((key: string) => (key === PII_HASH_SALT_ENV ? (opts?.salt ?? "salt") : undefined)),
  };
  const service = new ActivityService(repo as any, workspaceContext as any, config as any);
  return { service, repo, workspaceContext };
};

describe("ActivityService.logActivity — PII at the write boundary", () => {
  it("hashea la IP y nunca persiste el valor crudo", async () => {
    const { service, repo } = makeService({ salt: "pepper" });

    await service.logActivity({ userId: "u-1", action: "auth.session.login", ipAddress: "1.2.3.4" });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.ipAddress).toBe(hashIp("1.2.3.4", "pepper"));
    expect(arg.ipAddress).not.toBe("1.2.3.4");
    expect(arg.ipAddress).toHaveLength(32);
  });

  it("descarta descripciones con texto libre y conserva tokens de taxonomía", async () => {
    const { service, repo } = makeService();

    await service.logActivity({ userId: "u-1", action: "a", description: "Paciente Juan archivado" });
    await service.logActivity({ userId: "u-1", action: "a", description: "auth.session.login" });

    expect(repo.create.mock.calls[0][0].description).toBeUndefined();
    expect(repo.create.mock.calls[1][0].description).toBe("auth.session.login");
  });

  it("aplica el whitelist por categoría al metadata", async () => {
    const { service, repo } = makeService();

    await service.logActivity({
      userId: "u-1",
      action: "clinical.patient.created",
      category: EventCategory.CLINICAL,
      metadata: { patientId: "p-1", counts: 2, note: "dolor abdominal" },
    });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({ patientId: "p-1", counts: 2 });
    expect(JSON.stringify(arg.metadata)).not.toContain("dolor");
  });

  describe("org resolution", () => {
    it("el organizationId explícito gana", async () => {
      const { service, repo } = makeService({ workspaceId: "org-w" });
      await service.logActivity({ userId: "u-1", action: "a", organizationId: "org-x" });
      expect(repo.create.mock.calls[0][0].organizationId).toBe("org-x");
    });

    it("cae al workspace context cuando no hay explícito", async () => {
      const { service, repo } = makeService({ workspaceId: "org-w" });
      await service.logActivity({ userId: "u-1", action: "a" });
      expect(repo.create.mock.calls[0][0].organizationId).toBe("org-w");
    });

    it("trata 'personal' y la ausencia de workspace como null", async () => {
      const personal = makeService({ workspaceId: "personal" });
      await personal.service.logActivity({ userId: "u-1", action: "a" });
      expect(personal.repo.create.mock.calls[0][0].organizationId).toBeNull();

      const none = makeService({ workspaceId: null });
      await none.service.logActivity({ userId: "u-1", action: "a" });
      expect(none.repo.create.mock.calls[0][0].organizationId).toBeNull();
    });
  });
});

describe("ActivityService.getUserActivity", () => {
  it("tenant: delega en findByOrganization con el scope requerido", async () => {
    const { service, repo } = makeService();

    await service.getUserActivity("u-1", undefined, 20, "clinical", "org-a");

    expect(repo.findByOrganization).toHaveBeenCalledWith(
      "org-a",
      expect.objectContaining({ userId: "u-1", take: 21, action: "clinical" }),
    );
    expect(repo.findGlobal).not.toHaveBeenCalled();
  });

  it("global (sin org): delega en findGlobal y NUNCA en el path tenant", async () => {
    const { service, repo } = makeService();

    await service.getUserActivity("u-1");

    expect(repo.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-1" }),
    );
    expect(repo.findByOrganization).not.toHaveBeenCalled();
  });

  it("decodifica el cursor base64 a fecha + id", async () => {
    const { service, repo } = makeService();
    const cursor = Buffer.from("2026-09-01T10:00:00.000Z_abc").toString("base64");

    await service.getUserActivity("u-1", cursor);

    const params = repo.findGlobal.mock.calls[0][0];
    expect(params.cursorId).toBe("abc");
    expect(params.cursorDate).toEqual(new Date("2026-09-01T10:00:00.000Z"));
  });
});

describe("ActivityService.getGlobalFeed — explicit scope", () => {
  it("tenant: usa findByOrganization cuando hay organizationId", async () => {
    const { service, repo } = makeService();

    await service.getGlobalFeed({ organizationId: "org-a", action: "clinical" });

    expect(repo.findByOrganization).toHaveBeenCalledWith(
      "org-a",
      expect.objectContaining({ action: "clinical" }),
    );
    expect(repo.findGlobal).not.toHaveBeenCalled();
  });

  it("global: usa findGlobal cuando NO hay organizationId", async () => {
    const { service, repo } = makeService();

    await service.getGlobalFeed({});

    expect(repo.findGlobal).toHaveBeenCalledTimes(1);
    expect(repo.findByOrganization).not.toHaveBeenCalled();
  });
});

describe("ActivityService.getActivityStats — explicit scope", () => {
  it("tenant: usa getStatsByOrganization", async () => {
    const { service, repo } = makeService();

    await service.getActivityStats({ organizationId: "org-a" });

    expect(repo.getStatsByOrganization).toHaveBeenCalledWith("org-a", {});
    expect(repo.getGlobalStats).not.toHaveBeenCalled();
  });

  it("global: usa getGlobalStats", async () => {
    const { service, repo } = makeService();

    await service.getActivityStats({});

    expect(repo.getGlobalStats).toHaveBeenCalledWith({});
    expect(repo.getStatsByOrganization).not.toHaveBeenCalled();
  });
});
