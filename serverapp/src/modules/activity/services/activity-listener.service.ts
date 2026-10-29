import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { ActivityService } from "./activity.service";
import { EventEnvelopeSchema } from "src/shared/event/event-envelope";
import type { EventEnvelope } from "src/shared/event/event-envelope";
import { getEventDefinition } from "src/shared/event/event-taxonomy";
import {
  buildLegacyFallbackName,
  legacyEventKey,
  mapLegacyDomainEvent,
} from "src/shared/event/legacy-event-map";

@Injectable()
export class ActivityListenerService {
  /** Log unmapped legacy pairs once, not on every emission. */
  private readonly warnedLegacyEvents = new Set<string>();

  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: LoggerService,
  ) {}

  @OnEvent("**")
  async handleAllEvents(payload: any): Promise<void> {
    try {
      if (!payload) return;

      // Happy path #1: new taxonomy envelope emitted through `emitEvent()`.
      const parsed = EventEnvelopeSchema.safeParse(payload);
      if (parsed.success) {
        await this.persistEnvelope(parsed.data as EventEnvelope);
        return;
      }

      // Happy path #2: legacy `DomainEvent` mapped through the taxonomy registry.
      if (!payload.action || !payload.entityName) return;
      await this.persistLegacy(payload as DomainEvent);
    } catch (error) {
      this.logger.logError(
        `ActivityListener: Failed to log event ${payload?.eventName ?? payload?.action}`,
        error,
      );
    }
  }

  private async persistEnvelope(envelope: EventEnvelope): Promise<void> {
    const definition = getEventDefinition(envelope.eventName);
    await this.activityService.logActivity({
      userId: envelope.actorId,
      action: envelope.eventName,
      description: envelope.eventName,
      ipAddress: envelope.ip,
      userAgent: envelope.userAgent,
      metadata: (envelope.payload ?? {}) as Record<string, any>,
      organizationId: envelope.orgId,
      eventName: envelope.eventName,
      category: definition.category,
      source: envelope.source,
      eventVersion: envelope.eventVersion,
    });
  }

  private async persistLegacy(event: DomainEvent): Promise<void> {
    const userId =
      event.userId || event.payload?.userId || event.metadata?.userId;
    if (!userId) return;

    const description = this.buildDescription(event);
    const shared = {
      userId,
      description,
      ipAddress: event.metadata?.ipAddress,
      userAgent: event.metadata?.userAgent,
      metadata: event.payload,
      organizationId: this.extractOrgId(event),
      source: this.detectLegacySource(event),
    };

    const mapped = mapLegacyDomainEvent(event.entityName, event.action);
    if (mapped) {
      const definition = getEventDefinition(mapped);
      await this.activityService.logActivity({
        ...shared,
        action: mapped,
        eventName: mapped,
        category: definition.category,
        eventVersion: definition.version,
      });
      return;
    }

    // Safety net: unmapped legacy event. NEVER persist the `Entity_ACTION`
    // mangle. Store a clearly-marked `legacy.*` action with no taxonomy metadata
    // so the row is preserved but excluded from taxonomy analytics.
    this.warnUnmappedLegacy(event.entityName, event.action);
    await this.activityService.logActivity({
      ...shared,
      action: buildLegacyFallbackName(event.entityName, event.action),
      eventName: null,
      category: null,
      eventVersion: null,
    });
  }

  private warnUnmappedLegacy(entityName: string, action: string): void {
    const key = legacyEventKey(entityName, action);
    if (this.warnedLegacyEvents.has(key)) return;
    this.warnedLegacyEvents.add(key);
    this.logger.warn(
      `ActivityListener: evento legacy sin mapeo a taxonomía (${key}); se persiste como legacy.*`,
    );
  }

  private extractOrgId(event: DomainEvent): string | undefined {
    const candidate =
      event.payload?.organizationId ?? event.metadata?.organizationId;
    return typeof candidate === "string" && candidate.length > 0
      ? candidate
      : undefined;
  }

  /**
   * Legacy `DomainEvent`s originate from server-side request handling. There is
   * no channel information, so they default to `api` (`system` is reserved for
   * cron/backend-originated events).
   */
  private detectLegacySource(_event: DomainEvent): "api" {
    return "api";
  }

  private buildDescription(payload: DomainEvent): string {
    if (payload.metadata?.description) return payload.metadata.description;
    if (typeof payload.payload === "string") return payload.payload;
    if (payload.payload?.description) return payload.payload.description;
    if (payload.payload?.email) return `User: ${payload.payload.email}`;
    if (payload.payload?.fullName) return `User: ${payload.payload.fullName}`;
    return `${payload.entityName || "unknown"} ${payload.action}`;
  }
}
