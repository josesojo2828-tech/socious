import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuthListenerService } from "./auth-listener.service";
import { emitEvent } from "src/shared/event/event-envelope";
import { PII_HASH_SALT_ENV } from "src/shared/event/pii";

/**
 * Phase 7 (task 7.2) — auth session lifecycle integration: `auth.session.login`
 * emitted through the REAL event bus creates a `UserSession`; `auth.session.logout`
 * closes it. The raw IP must never reach the session row.
 *
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent), so
 * this spec is authored but not executed in this phase.
 */
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const RAW_IP = "203.0.113.7";

const makeHarness = (salt = "pepper") => {
  const userSession = {
    create: jest.fn().mockResolvedValue({ id: "s-1" }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { userSession };
  const logger = { logError: jest.fn(), warn: jest.fn() };
  const config = {
    get: jest.fn((key: string) => (key === PII_HASH_SALT_ENV ? salt : undefined)),
  };
  const listener = new AuthListenerService(prisma as any, logger as any, config as any);

  const emitter = new EventEmitter2();
  let pending: Promise<void> = Promise.resolve();
  const received: any[] = [];
  emitter.on("auth.session.login", (payload) => {
    received.push(payload);
    pending = listener.handleLogin(payload);
  });
  emitter.on("auth.session.logout", (payload) => {
    received.push(payload);
    pending = listener.handleLogout(payload);
  });

  return { emitter, listener, userSession, logger, received, flush: () => pending };
};

describe("auth session lifecycle (emitEvent → listeners)", () => {
  it("login emite y crea UserSession con orgId y la IP hasheada (nunca cruda)", async () => {
    const h = makeHarness();

    emitEvent(h.emitter, {
      eventName: "auth.session.login",
      actorId: ACTOR_ID,
      orgId: ORG_ID,
      source: "web",
      ip: RAW_IP,
      userAgent: "jest-agent",
      payload: { method: "password", device: "desktop" },
    });
    await h.flush();

    expect(h.received).toHaveLength(1);
    expect(h.userSession.create).toHaveBeenCalledTimes(1);

    const arg = h.userSession.create.mock.calls[0][0].data;
    expect(arg).toMatchObject({
      userId: ACTOR_ID,
      organizationId: ORG_ID,
      userAgent: "jest-agent",
      device: "desktop",
      active: true,
    });
    expect(arg.startedAt).toBeInstanceOf(Date);
    expect(arg.ipAddress).not.toBe(RAW_IP);
    expect(arg.ipAddress).toHaveLength(32);
    expect(JSON.stringify(arg)).not.toContain(RAW_IP);
  });

  it("login sin organización persiste orgId null", async () => {
    const h = makeHarness();

    emitEvent(h.emitter, {
      eventName: "auth.session.login",
      actorId: ACTOR_ID,
      orgId: null,
      source: "web",
      payload: { method: "password" },
    });
    await h.flush();

    expect(h.userSession.create.mock.calls[0][0].data.organizationId).toBeNull();
  });

  it("logout cierra la sesión activa (endedAt + active=false)", async () => {
    const h = makeHarness();

    emitEvent(h.emitter, {
      eventName: "auth.session.logout",
      actorId: ACTOR_ID,
      orgId: ORG_ID,
      source: "web",
      payload: { method: "password" },
    });
    await h.flush();

    expect(h.userSession.updateMany).toHaveBeenCalledTimes(1);
    expect(h.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: ACTOR_ID, active: true },
      data: { endedAt: expect.any(Date), active: false },
    });
  });

  it("un fallo al crear la sesión se traga (no rompe el login)", async () => {
    const h = makeHarness();
    h.userSession.create.mockRejectedValueOnce(new Error("db down"));

    emitEvent(h.emitter, {
      eventName: "auth.session.login",
      actorId: ACTOR_ID,
      orgId: null,
      source: "web",
      payload: { method: "password" },
    });

    await expect(h.flush()).resolves.toBeUndefined();
    expect(h.logger.logError).toHaveBeenCalledTimes(1);
  });
});
