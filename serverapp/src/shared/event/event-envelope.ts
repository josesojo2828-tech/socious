import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  EventName,
  EventNameSchema,
  getEventDefinition,
} from "./event-taxonomy";
import { sanitizeEventPayload } from "./payload-whitelist";

const logger = new Logger("EventEnvelope");

/**
 * Origin channel of an event.
 *
 * - `web` / `mobile` / `api`: interactive traffic (defaults to `web` when the
 *   platform cannot be detected).
 * - `system`: backend/cron-originated events (billing renewals, retention jobs,
 *   etc.) that have no interactive caller.
 */
export const EVENT_SOURCES = ["web", "mobile", "api", "system"] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

export const EventSourceSchema = z.enum(EVENT_SOURCES);

/**
 * Canonical telemetry envelope.
 *
 * NOTE: `sessionId` is intentionally NOT part of the envelope — session-level
 * correlation is out of scope (see design D8).
 */
export interface EventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventName: EventName;
  eventVersion: string;
  actorId: string;
  orgId: string | null;
  ip?: string;
  userAgent?: string;
  source: EventSource;
  occurredAt: Date;
  payload: T;
}

export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventName: EventNameSchema,
  eventVersion: z.string().min(1),
  actorId: z.string().uuid(),
  orgId: z.string().uuid().nullable(),
  ip: z.string().max(128).optional(),
  userAgent: z.string().max(512).optional(),
  source: EventSourceSchema,
  occurredAt: z.date(),
  payload: z.record(z.string(), z.unknown()),
});

export interface EmitEventParams<T = Record<string, unknown>> {
  eventName: EventName;
  actorId: string;
  orgId: string | null;
  source: EventSource;
  payload?: T;
  ip?: string;
  userAgent?: string;
  occurredAt?: Date;
  eventId?: string;
}

/**
 * Fire-and-forget event emission.
 *
 * Validates the envelope against the taxonomy and emits it through the global
 * `EventEmitter2`. Any failure (unknown event name, invalid envelope, throwing
 * listener) is swallowed and logged so telemetry can NEVER break the caller's
 * control flow (e.g. login).
 */
export function emitEvent<T = Record<string, unknown>>(
  emitter: EventEmitter2,
  params: EmitEventParams<T>,
): void {
  try {
    const definition = getEventDefinition(params.eventName);

    // PII minimization: only IDs/enums/counts/durations/hashes survive the
    // per-category whitelist before the envelope is emitted/persisted.
    const sanitizedPayload = sanitizeEventPayload(
      definition.category,
      params.payload ?? {},
    );

    const envelope: EventEnvelope<T> = {
      eventId: params.eventId ?? randomUUID(),
      eventName: params.eventName,
      eventVersion: definition.version,
      actorId: params.actorId,
      orgId: params.orgId,
      ip: params.ip,
      userAgent: params.userAgent,
      source: params.source,
      occurredAt: params.occurredAt ?? new Date(),
      payload: sanitizedPayload as T,
    };

    EventEnvelopeSchema.parse(envelope);

    emitter.emit(envelope.eventName, envelope);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to emit telemetry event "${params.eventName}": ${message}`);
  }
}
