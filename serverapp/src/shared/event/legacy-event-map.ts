import { EventName, isEventName } from "./event-taxonomy";

/**
 * Registry that maps legacy `DomainEvent` (`entityName` + `action`) pairs to the
 * versioned taxonomy (`<domain>.<entity>.<verb>`).
 *
 * The legacy wildcard listener used to persist `${entityName}_${action}`
 * (e.g. `User_USER_CREATED`). That mangle is GONE: mapped pairs persist their
 * taxonomy name; unmapped pairs fall through to a clearly-marked `legacy.*`
 * safety-net name (see `buildLegacyFallbackName`).
 *
 * Keys are normalized as `${entityName}:${action}` lowercased. Keep this table
 * conservative: only add mappings whose semantics are unambiguous, otherwise the
 * safety net is the correct destination (data is preserved, taxonomy stays clean).
 */
export const LEGACY_EVENT_MAP: Record<string, EventName> = {
  // clinical.patient.*
  "patient:patient_created": "clinical.patient.created",
  "patient:create": "clinical.patient.created",
  "patient:patient_archived": "clinical.patient.archived",
  "patient:archive": "clinical.patient.archived",

  // clinical.consultation.*
  "consultation:consultation_created": "clinical.consultation.started",
  "consultation:create": "clinical.consultation.started",

  // clinical.plan.*
  "nutritionalplan:plan_created": "clinical.plan.created",
  "nutritionalplan:create": "clinical.plan.created",
};

export const LEGACY_FALLBACK_PREFIX = "legacy.";

export function legacyEventKey(entityName: string, action: string): string {
  return `${(entityName ?? "").toLowerCase()}:${(action ?? "").toLowerCase()}`;
}

/**
 * Resolves a legacy `DomainEvent` to a taxonomy event name, or `null` when the
 * pair is not registered (the caller should use the safety-net fallback).
 */
export function mapLegacyDomainEvent(
  entityName: string,
  action: string,
): EventName | null {
  if (!entityName || !action) return null;
  const mapped = LEGACY_EVENT_MAP[legacyEventKey(entityName, action)];
  return mapped && isEventName(mapped) ? mapped : null;
}

function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function deriveVerb(entityName: string, action: string): string {
  const lower = (action ?? "").toLowerCase();
  const prefix = `${snakeCase(entityName ?? "")}_`;
  if (prefix !== "_" && lower.startsWith(prefix)) {
    return lower.slice(prefix.length);
  }
  return lower;
}

/**
 * Builds the clearly-marked fallback action for an unmapped legacy event.
 *
 * It NEVER produces the `${entityName}_${action}` mangle — instead it returns a
 * `legacy.<entity>.<verb>` name that is safe to persist while remaining
 * excludable from taxonomy analytics (rows written through the fallback keep
 * `eventName = null`).
 */
export function buildLegacyFallbackName(
  entityName: string,
  action: string,
): string {
  const entity = snakeCase(entityName || "unknown");
  const verb = deriveVerb(entityName, action) || "unknown";
  return `${LEGACY_FALLBACK_PREFIX}${entity}.${verb}`;
}
