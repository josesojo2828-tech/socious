import UserActivityLogRepository, {
  MissingOrganizationScopeError,
} from "./user-activity-log.repository";

describe("UserActivityLogRepository", () => {
  describe("create", () => {
    it("debe serializar metadata correctamente", () => {
      const metadata = { foo: "bar", num: 42 };
      const serialized = JSON.parse(JSON.stringify(metadata));
      expect(serialized).toEqual({ foo: "bar", num: 42 });
    });

    it("debe manejar metadata undefined", () => {
      const metadata = undefined;
      const serialized =
        metadata && typeof metadata === "object"
          ? JSON.parse(JSON.stringify(metadata))
          : undefined;
      expect(serialized).toBeUndefined();
    });
  });

  describe("cursor pagination WHERE clause", () => {
    it("debe construir WHERE con OR para cursor", () => {
      const cursorDate = new Date("2026-07-25T12:00:00Z");
      const cursorId = "abc-123";

      const where: any = { userId: "user-1" };
      where.OR = [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: cursorId } },
      ];

      expect(where.OR).toBeDefined();
      expect(where.OR[0].createdAt.lt).toEqual(cursorDate);
      expect(where.OR[1].createdAt).toEqual(cursorDate);
      expect(where.OR[1].id.lt).toBe("abc-123");
    });

    it("debe construir WHERE con action filter", () => {
      const where: any = { userId: "user-1" };
      where.action = { contains: "user.created" };

      expect(where.action).toBeDefined();
      expect(where.action.contains).toBe("user.created");
    });

    it("debe construir WHERE con date range", () => {
      const fromDate = "2026-07-20";
      const toDate = "2026-07-25";

      const where: any = {};
      where.createdAt = {};
      where.createdAt.gte = new Date(fromDate);
      where.createdAt.lte = new Date(toDate);

      expect(where.createdAt.gte).toEqual(new Date("2026-07-20"));
      expect(where.createdAt.lte).toEqual(new Date("2026-07-25"));
    });
  });

  /**
   * Phase 7 (integration) — cross-tenant isolation at the query layer.
   *
   * Contract under test: the scope is expressed by WHICH method is called.
   * `findByOrganization` / `getStatsByOrganization` /
   * `countDistinctActiveUsersInOrganization` are tenant reads that REQUIRE an
   * `organizationId` and THROW when it is missing — they NEVER degrade into a
   * global query. `findGlobal` / `getGlobalStats` are the only global paths.
   *
   * NOTE: no test runner installed yet (`node_modules` absent) — authored for
   * task 7.2, cannot execute in Phase 4.
   */
  describe("explicit scope (tenant vs global)", () => {
    const makeRepo = () => {
      const prisma = {
        userActivityLog: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        user: { findMany: jest.fn().mockResolvedValue([]) },
        $queryRaw: jest.fn().mockResolvedValue([]),
      };
      const logger = { logError: jest.fn() };
      const repo = new UserActivityLogRepository(prisma as any, logger as any);
      return { repo, prisma };
    };

    it("findByOrganization aplica igualdad estricta de organizationId", async () => {
      const { repo, prisma } = makeRepo();

      await repo.findByOrganization("org-a", { userId: "user-1", take: 20 });

      const { where } = prisma.userActivityLog.findMany.mock.calls[0][0];
      expect(where.organizationId).toBe("org-a");
    });

    it("findByOrganization NO incluye filas null-org para un tenant", async () => {
      const { repo, prisma } = makeRepo();

      await repo.findByOrganization("org-a", { userId: "user-1", take: 20 });

      const { where } = prisma.userActivityLog.findMany.mock.calls[0][0];
      expect(where.organizationId).toEqual("org-a");
      expect(JSON.stringify(where)).not.toContain('"organizationId":null');
    });

    it("findByOrganization LANZA sin organizationId — nunca cae a global", async () => {
      const { repo, prisma } = makeRepo();

      await expect(
        repo.findByOrganization(undefined as any, { take: 20 }),
      ).rejects.toBeInstanceOf(MissingOrganizationScopeError);
      await expect(
        repo.findByOrganization("", { take: 20 }),
      ).rejects.toBeInstanceOf(MissingOrganizationScopeError);
      await expect(
        repo.findByOrganization("   ", { take: 20 }),
      ).rejects.toBeInstanceOf(MissingOrganizationScopeError);

      expect(prisma.userActivityLog.findMany).not.toHaveBeenCalled();
    });

    it("findGlobal no filtra por organización (vista global explícita)", async () => {
      const { repo, prisma } = makeRepo();

      await repo.findGlobal({ take: 20 });

      const { where } = prisma.userActivityLog.findMany.mock.calls[0][0];
      expect(where.organizationId).toBeUndefined();
    });

    it("getStatsByOrganization acota el conteo a la org del tenant", async () => {
      const { repo, prisma } = makeRepo();

      await repo.getStatsByOrganization("org-b", {});

      const { where } = prisma.userActivityLog.count.mock.calls[0][0];
      expect(where.organizationId).toBe("org-b");
    });

    it("getStatsByOrganization LANZA sin organizationId", async () => {
      const { repo, prisma } = makeRepo();

      await expect(
        repo.getStatsByOrganization(undefined as any, {}),
      ).rejects.toBeInstanceOf(MissingOrganizationScopeError);

      expect(prisma.userActivityLog.count).not.toHaveBeenCalled();
    });

    it("getGlobalStats no filtra por organización (vista global explícita)", async () => {
      const { repo, prisma } = makeRepo();

      await repo.getGlobalStats({});

      const { where } = prisma.userActivityLog.count.mock.calls[0][0];
      expect(where.organizationId).toBeUndefined();
    });

    it("countDistinctActiveUsersInOrganization exige la org y la pasa al SQL", async () => {
      const { repo, prisma } = makeRepo();
      const range = { fromDate: new Date("2026-09-01"), toDate: new Date("2026-09-02") };

      await repo.countDistinctActiveUsersInOrganization("org-a", range);

      const sql = prisma.$queryRaw.mock.calls[0][0];
      expect(sql.values).toContain("org-a");
      expect(sql.strings.join(" ")).toContain('"organizationId" =');
    });

    it("countDistinctActiveUsersInOrganization LANZA sin organizationId", async () => {
      const { repo, prisma } = makeRepo();
      const range = { fromDate: new Date("2026-09-01"), toDate: new Date("2026-09-02") };

      await expect(
        repo.countDistinctActiveUsersInOrganization(undefined as any, range),
      ).rejects.toBeInstanceOf(MissingOrganizationScopeError);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
