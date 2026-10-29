import { ActivityListenerService } from "./activity-listener.service";
import { DomainEvent } from "src/shared/event/domain-listener";
import { EventCategory } from "src/shared/event/event-taxonomy";
import type { EventEnvelope } from "src/shared/event/event-envelope";

/**
 * Phase 7 (task 7.1/7.2) — taxonomy mapping + legacy fallback of the wildcard
 * activity listener, exercised against the REAL service.
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent),
 * so this spec is authored but not executed in this phase.
 */
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";

const makeService = () => {
  const activityService = { logActivity: jest.fn().mockResolvedValue(undefined) };
  const logger = { logError: jest.fn(), warn: jest.fn() };
  const service = new ActivityListenerService(activityService as any, logger as any);
  return { service, activityService, logger };
};

const envelope = (over: Partial<EventEnvelope> = {}): EventEnvelope => ({
  eventId: "33333333-3333-4333-8333-333333333333",
  eventName: "clinical.patient.created",
  eventVersion: "v1",
  actorId: ACTOR_ID,
  orgId: ORG_ID,
  ip: "hashed-ip",
  userAgent: "jest",
  source: "web",
  occurredAt: new Date("2026-09-28T12:00:00.000Z"),
  payload: { patientId: "p-1" },
  ...over,
});

describe("ActivityListenerService", () => {
  it("persiste un envelope de taxonomía con su eventName/categoría", async () => {
    const { service, activityService } = makeService();

    await service.handleAllEvents(envelope());

    expect(activityService.logActivity).toHaveBeenCalledTimes(1);
    expect(activityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ACTOR_ID,
        action: "clinical.patient.created",
        eventName: "clinical.patient.created",
        category: EventCategory.CLINICAL,
        organizationId: ORG_ID,
        source: "web",
        eventVersion: "v1",
        metadata: { patientId: "p-1" },
      }),
    );
  });

  it("mapea un DomainEvent legacy (Patient/create) a la taxonomía", async () => {
    const { service, activityService } = makeService();

    await service.handleAllEvents(
      new DomainEvent({ entityName: "Patient", action: "create", payload: {}, userId: "u-1" }),
    );

    expect(activityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        action: "clinical.patient.created",
        eventName: "clinical.patient.created",
        category: EventCategory.CLINICAL,
        source: "api",
      }),
    );
  });

  it("mapea el par legacy en mayúsculas (Patient/PATIENT_CREATED)", async () => {
    const { service, activityService } = makeService();

    await service.handleAllEvents(
      new DomainEvent({
        entityName: "Patient",
        action: "PATIENT_CREATED",
        payload: {},
        userId: "u-1",
      }),
    );

    expect(activityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "clinical.patient.created", eventName: "clinical.patient.created" }),
    );
  });

  it("NUNCA persiste el mangle Entity_EVENT: sin mapeo cae a legacy.* con eventName null", async () => {
    const { service, activityService, logger } = makeService();

    await service.handleAllEvents(
      new DomainEvent({
        entityName: "User",
        action: "USER_CREATED",
        payload: {},
        userId: "u-1",
      }),
    );

    const arg = activityService.logActivity.mock.calls[0][0];
    expect(arg.action).not.toBe("User_USER_CREATED");
    expect(arg.action.startsWith("legacy.")).toBe(true);
    expect(arg.eventName).toBeNull();
    expect(arg.category).toBeNull();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("ignora eventos legacy sin userId", async () => {
    const { service, activityService } = makeService();

    await service.handleAllEvents(
      new DomainEvent({ entityName: "Patient", action: "create", payload: {} }),
    );

    expect(activityService.logActivity).not.toHaveBeenCalled();
  });

  it("ignora payloads vacíos", async () => {
    const { service, activityService } = makeService();
    await service.handleAllEvents(undefined);
    await service.handleAllEvents(null);
    expect(activityService.logActivity).not.toHaveBeenCalled();
  });

  it("traga fallos del persist (fire-and-forget) y loguea", async () => {
    const { service, activityService, logger } = makeService();
    activityService.logActivity.mockRejectedValueOnce(new Error("db down"));

    await expect(service.handleAllEvents(envelope())).resolves.toBeUndefined();
    expect(logger.logError).toHaveBeenCalledTimes(1);
  });
});
