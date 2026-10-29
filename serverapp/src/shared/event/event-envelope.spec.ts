import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  EVENT_SOURCES,
  EventEnvelope,
  EventEnvelopeSchema,
  emitEvent,
} from "./event-envelope";

/**
 * Phase 7 (task 7.1) — event envelope shape + fire-and-forget `emitEvent()`.
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent),
 * so this spec is authored but not executed in this phase.
 */
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "33333333-3333-4333-8333-333333333333";

const validEnvelope = (): EventEnvelope => ({
  eventId: EVENT_ID,
  eventName: "clinical.patient.created",
  eventVersion: "v1",
  actorId: ACTOR_ID,
  orgId: ORG_ID,
  ip: "hashed",
  userAgent: "jest",
  source: "web",
  occurredAt: new Date("2026-09-28T12:00:00.000Z"),
  payload: { patientId: "p-1" },
});

describe("EventEnvelopeSchema", () => {
  it("acepta un envelope completo", () => {
    expect(EventEnvelopeSchema.safeParse(validEnvelope()).success).toBe(true);
  });

  it("acepta orgId null (eventos de auth sin workspace)", () => {
    const parsed = EventEnvelopeSchema.safeParse({ ...validEnvelope(), orgId: null });
    expect(parsed.success).toBe(true);
  });

  it("exige actorId, eventName válido y occurredAt", () => {
    expect(EventEnvelopeSchema.safeParse({ ...validEnvelope(), actorId: undefined }).success).toBe(
      false,
    );
    expect(
      EventEnvelopeSchema.safeParse({ ...validEnvelope(), eventName: "Patient_CREATE" }).success,
    ).toBe(false);
    expect(
      EventEnvelopeSchema.safeParse({ ...validEnvelope(), occurredAt: undefined }).success,
    ).toBe(false);
  });

  it("rechaza source fuera del canal de origen (nunca el dominio 'auth')", () => {
    expect(
      EventEnvelopeSchema.safeParse({ ...validEnvelope(), source: "auth" }).success,
    ).toBe(false);
  });

  it("acepta todos los canales de origen declarados (web|mobile|api|system)", () => {
    for (const source of EVENT_SOURCES) {
      expect(EventEnvelopeSchema.safeParse({ ...validEnvelope(), source }).success).toBe(true);
    }
    expect(EVENT_SOURCES).toContain("system");
  });

  it("NO incluye sessionId en el shape ni lo conserva al parsear", () => {
    expect("sessionId" in EventEnvelopeSchema.shape).toBe(false);

    const parsed = EventEnvelopeSchema.parse({ ...validEnvelope(), sessionId: "sid-1" });
    expect("sessionId" in parsed).toBe(false);
  });
});

describe("emitEvent (fire-and-forget)", () => {
  const makeEmitter = () => {
    const emitter = new EventEmitter2();
    const spy = jest.spyOn(emitter, "emit");
    return { emitter, spy };
  };

  it("valida y emite el envelope con los campos esperados", () => {
    const { emitter, spy } = makeEmitter();

    emitEvent(emitter, {
      eventName: "auth.session.login",
      actorId: ACTOR_ID,
      orgId: null,
      source: "web",
      ip: "1.2.3.4",
      userAgent: "jest",
      payload: { method: "password" },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [name, envelope] = spy.mock.calls[0] as [string, EventEnvelope];
    expect(name).toBe("auth.session.login");
    expect(envelope.eventName).toBe("auth.session.login");
    expect(envelope.eventVersion).toBe("v1");
    expect(envelope.actorId).toBe(ACTOR_ID);
    expect(envelope.orgId).toBeNull();
    expect(envelope.source).toBe("web");
    expect(envelope.eventId).toEqual(expect.any(String));
    expect(envelope.occurredAt).toBeInstanceOf(Date);
  });

  it("sanitiza el payload antes de emitir (sin texto libre)", () => {
    const { emitter, spy } = makeEmitter();

    emitEvent(emitter, {
      eventName: "auth.session.login",
      actorId: ACTOR_ID,
      orgId: null,
      source: "web",
      payload: { method: "password", note: "texto libre", password: "secreto" },
    });

    const [, envelope] = spy.mock.calls[0] as [string, EventEnvelope];
    expect(envelope.payload).toEqual({ method: "password" });
  });

  it("NO lanza ni emite cuando el eventName es desconocido", () => {
    const { emitter, spy } = makeEmitter();

    expect(() =>
      emitEvent(emitter, {
        // @ts-expect-error — probamos explícitamente un nombre fuera de la taxonomía
        eventName: "foo.bar.baz",
        actorId: ACTOR_ID,
        orgId: null,
        source: "web",
      }),
    ).not.toThrow();

    expect(spy).not.toHaveBeenCalled();
  });

  it("traga la excepción cuando un listener/emitter falla", () => {
    const emitter = new EventEmitter2();
    jest.spyOn(emitter, "emit").mockImplementation(() => {
      throw new Error("store unavailable");
    });

    expect(() =>
      emitEvent(emitter, {
        eventName: "auth.session.login",
        actorId: ACTOR_ID,
        orgId: null,
        source: "web",
      }),
    ).not.toThrow();
  });

  it("traga el error de validación cuando source es inválido", () => {
    const { emitter, spy } = makeEmitter();

    expect(() =>
      emitEvent(emitter, {
        eventName: "auth.session.login",
        actorId: ACTOR_ID,
        orgId: null,
        // @ts-expect-error — canal inválido a propósito
        source: "auth",
      }),
    ).not.toThrow();

    expect(spy).not.toHaveBeenCalled();
  });
});
