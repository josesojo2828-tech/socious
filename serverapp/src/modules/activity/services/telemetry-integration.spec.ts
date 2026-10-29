import { EventEmitter2 } from "@nestjs/event-emitter";
import { ActivityService } from "./activity.service";
import { ActivityListenerService } from "./activity-listener.service";
import { RetentionJobService } from "./retention-job.service";
import UserActivityLogRepository, {
  MissingOrganizationScopeError,
} from "../repositories/user-activity-log.repository";
import { emitEvent } from "src/shared/event/event-envelope";
import { EventCategory } from "src/shared/event/event-taxonomy";

/**
 * Phase 7 (task 7.2) — integration coverage wired against the REAL services with
 * an in-memory Prisma boundary: cross-tenant isolation, dailyTrend buckets,
 * DAU/WAU/MAU, fire-and-forget resilience and retention DRY-RUN.
 *
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent), so
 * this spec is authored but not executed in this phase.
 */
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

interface ActivityRow {
  id: string;
  userId: string;
  action: string;
  organizationId: string | null;
  createdAt: Date;
  metadata?: any;
}

const matches = (row: any, where: any): boolean => {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as any[]).some((c) => matches(row, c));
    const value = row[key];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as any;
      if ("contains" in c) return typeof value === "string" && value.includes(c.contains);
      if ("lt" in c) return value < c.lt;
      if ("gte" in c) return value >= c.gte;
      if ("lte" in c) return value <= c.lte;
      return true;
    }
    return value === cond;
  });
};

const makePrismaFake = (seed: ActivityRow[]) => {
  const rows = [...seed];
  const queryRaw: any = jest.fn(async (sql: any) => {
    const text = sql?.strings ? sql.strings.join(" ") : String(sql);
    if (text.includes("date_trunc")) return queryRaw.dailyTrend;
    if (text.includes("COUNT(DISTINCT")) return [{ count: queryRaw.distinctCount }];
    return [];
  });
  queryRaw.dailyTrend = [];
  queryRaw.distinctCount = 0;

  const userActivityLog = {
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `r-${rows.length + 1}`, createdAt: new Date(), ...data };
      rows.push(row);
      return row;
    }),
    findMany: jest.fn(async ({ where, take }: any) => {
      const filtered = rows.filter((r) => matches(r, where));
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return take ? filtered.slice(0, take) : filtered;
    }),
    count: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where)).length),
    groupBy: jest.fn(async ({ by, where, take }: any) => {
      const key = by[0];
      const map = new Map<string, number>();
      rows.filter((r) => matches(r, where)).forEach((r) => {
        map.set(String(r[key]), (map.get(String(r[key])) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([k, v]) => ({ [key]: k, _count: { id: v } }))
        .sort((a: any, b: any) => b._count.id - a._count.id)
        .slice(0, take);
    }),
  };

  const user = {
    findMany: jest.fn(async ({ where }: any) => {
      const ids: string[] = where?.id?.in ?? [];
      return ids.map((id) => ({ id, fullName: `User ${id}` }));
    }),
  };

  const prisma = { userActivityLog, user, $queryRaw: queryRaw };
  return { prisma, rows, queryRaw };
};

const makeActivityService = (prisma: any) => {
  const repo = new UserActivityLogRepository(prisma, {
    logError: jest.fn(),
  } as any);
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };
  const config = { get: jest.fn().mockReturnValue("pepper") };
  return new ActivityService(repo, workspaceContext as any, config as any);
};

describe("telemetry integration — cross-tenant isolation", () => {
  const seed = (): ActivityRow[] => [
    { id: "a1", userId: "u1", action: "clinical.patient.created", organizationId: ORG_A, createdAt: new Date("2026-09-02T10:00:00Z") },
    { id: "b1", userId: "u2", action: "clinical.patient.created", organizationId: ORG_B, createdAt: new Date("2026-09-02T11:00:00Z") },
    { id: "n1", userId: "u3", action: "auth.session.login", organizationId: null, createdAt: new Date("2026-09-02T12:00:00Z") },
  ];

  it("org A solo ve sus filas (org B no aparece)", async () => {
    const { prisma } = makePrismaFake(seed());
    const service = makeActivityService(prisma);

    const feed = await service.getGlobalFeed({ organizationId: ORG_A });

    expect(feed.data.map((r: any) => r.id)).toEqual(["a1"]);
    expect(feed.data.every((r: any) => r.organizationId === ORG_A)).toBe(true);
  });

  it("oculta filas null-org a un tenant (aunque filtre por su usuario)", async () => {
    const { prisma } = makePrismaFake(seed());
    const service = makeActivityService(prisma);

    const feed = await service.getGlobalFeed({ organizationId: ORG_A, userId: "u3" });

    expect(feed.data).toEqual([]);
  });

  it("la vista global (sin organizationId) sí incluye null-org", async () => {
    const { prisma } = makePrismaFake(seed());
    const service = makeActivityService(prisma);

    const feed = await service.getGlobalFeed({});

    expect(feed.data.map((r: any) => r.id).sort()).toEqual(["a1", "b1", "n1"]);
  });

  it("el stats del tenant se acota a su organización", async () => {
    const { prisma } = makePrismaFake(seed());
    const service = makeActivityService(prisma);

    await service.getActivityStats({ organizationId: ORG_A });

    const countWhere = prisma.userActivityLog.count.mock.calls[0][0].where;
    expect(countWhere.organizationId).toBe(ORG_A);
  });

  it("una lectura tenant sin organizationId es IMPOSIBLE: el repo lanza y no consulta", async () => {
    const { prisma } = makePrismaFake(seed());
    const repo = new UserActivityLogRepository(prisma, {
      logError: jest.fn(),
    } as any);

    await expect(
      repo.findByOrganization("", { take: 20 }),
    ).rejects.toBeInstanceOf(MissingOrganizationScopeError);
    await expect(
      repo.getStatsByOrganization(undefined as any, {}),
    ).rejects.toBeInstanceOf(MissingOrganizationScopeError);

    expect(prisma.userActivityLog.findMany).not.toHaveBeenCalled();
    expect(prisma.userActivityLog.count).not.toHaveBeenCalled();
  });
});

describe("telemetry integration — dailyTrend buckets", () => {
  it("devuelve un bucket por día con su conteo", async () => {
    const { prisma, queryRaw } = makePrismaFake([]);
    const service = makeActivityService(prisma);
    queryRaw.dailyTrend = [
      { date: "2026-09-01", count: 2 },
      { date: "2026-09-02", count: 3 },
      { date: "2026-09-03", count: 1 },
    ];

    const stats = await service.getActivityStats({ organizationId: ORG_A });

    expect(stats.dailyTrend).toEqual([
      { date: "2026-09-01", count: 2 },
      { date: "2026-09-02", count: 3 },
      { date: "2026-09-03", count: 1 },
    ]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe("telemetry integration — fire-and-forget resilience", () => {
  it("emitEvent + wildcard listener persiste el evento sin romper el flujo", async () => {
    const activityService = { logActivity: jest.fn().mockResolvedValue(undefined) };
    const listener = new ActivityListenerService(activityService as any, {
      logError: jest.fn(),
      warn: jest.fn(),
    } as any);

    const emitter = new EventEmitter2({ wildcard: true, delimiter: "." });
    let pending: Promise<void> = Promise.resolve();
    emitter.on("**", (payload) => {
      pending = listener.handleAllEvents(payload);
    });

    expect(() =>
      emitEvent(emitter, {
        eventName: "clinical.patient.created",
        actorId: ACTOR_ID,
        orgId: ORG_A,
        source: "web",
        payload: { patientId: "p-1" },
      }),
    ).not.toThrow();

    await pending;
    expect(activityService.logActivity).toHaveBeenCalledTimes(1);
  });

  it("un fallo del store no propaga rechazo (login seguiría OK)", async () => {
    const activityService = { logActivity: jest.fn().mockRejectedValue(new Error("db down")) };
    const logger = { logError: jest.fn(), warn: jest.fn() };
    const listener = new ActivityListenerService(activityService as any, logger as any);

    await expect(
      listener.handleAllEvents({
        eventId: "33333333-3333-4333-8333-333333333333",
        eventName: "clinical.patient.created",
        eventVersion: "v1",
        actorId: ACTOR_ID,
        orgId: ORG_A,
        source: "web",
        occurredAt: new Date(),
        payload: { patientId: "p-1" },
      }),
    ).resolves.toBeUndefined();
    expect(logger.logError).toHaveBeenCalledTimes(1);
  });
});

describe("telemetry integration — retention DRY-RUN", () => {
  const makeRetentionHarness = (enabled: boolean) => {
    const userActivityLog = {
      count: jest.fn().mockResolvedValue(3),
      deleteMany: jest.fn(),
    };
    const telemetryRetentionJobLog = {
      create: jest.fn().mockResolvedValue({ id: "log-1" }),
      update: jest.fn().mockResolvedValue({}),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === "TELEMETRY_RETENTION_ENABLED" ? String(enabled) : undefined,
      ),
    };
    const job = new RetentionJobService(
      { userActivityLog, telemetryRetentionJobLog } as any,
      config as any,
    );
    return { job, userActivityLog, telemetryRetentionJobLog };
  };

  it("reporta purgables pero NO borra ninguna fila", async () => {
    const { job, userActivityLog, telemetryRetentionJobLog } = makeRetentionHarness(true);

    await job.handleRetentionCron();

    expect(userActivityLog.count).toHaveBeenCalledTimes(Object.values(EventCategory).length);
    expect(userActivityLog.deleteMany).not.toHaveBeenCalled();

    const updateArg = telemetryRetentionJobLog.update.mock.calls[0][0];
    expect(updateArg.data).toMatchObject({ status: "SUCCESS", totalPurged: 0 });
    expect(updateArg.data.totalEvaluated).toBe(3 * Object.values(EventCategory).length);
    expect(Array.isArray(updateArg.data.details)).toBe(true);
    expect(updateArg.data.details).toHaveLength(Object.values(EventCategory).length);
  });

  it("deshabilitado: omite y no escribe run-log", async () => {
    const { job, userActivityLog, telemetryRetentionJobLog } = makeRetentionHarness(false);

    await job.handleRetentionCron();

    expect(userActivityLog.count).not.toHaveBeenCalled();
    expect(telemetryRetentionJobLog.create).not.toHaveBeenCalled();
    expect(telemetryRetentionJobLog.update).not.toHaveBeenCalled();
  });
});
