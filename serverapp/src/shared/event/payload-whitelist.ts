import { EventCategory } from "./event-taxonomy";

/**
 * Per-category payload whitelist (spec: "Per-category context").
 *
 * Only IDs, enums, counts, durations and hashes are allowed to persist. Free
 * text and clinical content MUST be stripped at the write boundary — this module
 * is the single source of truth for that filter.
 */
export const PAYLOAD_WHITELIST: Record<EventCategory, readonly string[]> = {
  [EventCategory.AUTH]: [
    "device",
    "userAgent",
    "mfaUsed",
    "method",
    "durationMs",
    "reasonCode",
  ],
  [EventCategory.CLINICAL]: [
    "patientId",
    "consultationId",
    "durationMs",
    "stepIndex",
    "count",
    "counts",
  ],
  [EventCategory.LIBRARY]: [
    "queryHash",
    "calculatorType",
    "resultType",
    "itemId",
    "source",
  ],
  [EventCategory.BILLING]: [
    "planId",
    "amountCents",
    "currency",
    "renewalJobId",
  ],
  [EventCategory.ADMIN]: ["targetId", "before", "after", "reasonCode"],
  [EventCategory.ORG]: ["orgId", "workspaceId", "targetUserId"],
};

/**
 * IDs are safe in every category: they reference entities, they do not describe
 * people or clinical content. Allowed even for legacy/unmapped events.
 */
export const UNIVERSAL_SAFE_KEYS: readonly string[] = [
  "id",
  "ids",
  "userId",
  "actorId",
  "orgId",
  "organizationId",
  "workspaceId",
  "targetUserId",
];

/**
 * Keys that commonly carry free text / PII / clinical content. Rejected in
 * generic (legacy/unmapped) mode. Value-level checks are the second line of
 * defense for keys that are not in this list.
 */
const UNSAFE_KEY_PATTERN =
  /(name|email|phone|address|note|description|desc|message|comment|content|text|body|query|diagnos|title|summary|password|token|secret|ssn|dni|document|birth|location|allerg|symptom|observ)/i;

/** Max length for a generic (non-whitelisted) string token — IDs/enums/hashes. */
const MAX_TOKEN_LENGTH = 128;

/** Whitelisted keys may carry longer strings (e.g. `userAgent`). */
const MAX_WHITELISTED_STRING_LENGTH = 512;

function isKnownCategory(value: unknown): value is EventCategory {
  return (
    typeof value === "string" &&
    (Object.values(EventCategory) as string[]).includes(value)
  );
}

function sanitizeValue(
  value: unknown,
  allowLongString: boolean,
): unknown {
  if (value === null) return null;

  const type = typeof value;
  if (type === "number" || type === "boolean") return value;

  if (type === "string") {
    const str = value as string;
    if (allowLongString) {
      return str.length <= MAX_WHITELISTED_STRING_LENGTH ? str : undefined;
    }
    // IDs/enums/hashes/versions: no whitespace, bounded length. Anything with
    // spaces (or too long) is assumed free text and dropped.
    return str.length > 0 && str.length <= MAX_TOKEN_LENGTH && !/\s/.test(str)
      ? str
      : undefined;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeValue(item, false))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  // Nested objects are dropped: they cannot be audited for free text cheaply.
  return undefined;
}

/**
 * Strips everything that is not an allowed ID/enum/count/duration/hash.
 *
 * - Known taxonomy category → strict per-category whitelist (+ universal IDs).
 * - Unknown/null category (legacy/unmapped) → conservative generic filter:
 *   unsafe keys are rejected and values must look like tokens, not free text.
 */
export function sanitizeEventPayload(
  category: string | null | undefined,
  payload: unknown,
): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const categoryKeys = isKnownCategory(category)
    ? new Set(PAYLOAD_WHITELIST[category])
    : null;
  const universalKeys = new Set(UNIVERSAL_SAFE_KEYS);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const isUniversal = universalKeys.has(key);
    const isAllowedKey = categoryKeys
      ? categoryKeys.has(key) || isUniversal
      : isUniversal || !UNSAFE_KEY_PATTERN.test(key);
    if (!isAllowedKey) continue;

    const allowLongString = categoryKeys?.has(key) ?? false;
    const sanitized = sanitizeValue(value, allowLongString);
    if (sanitized !== undefined) result[key] = sanitized;
  }

  return result;
}

/**
 * Descriptions are free text by nature. Only taxonomy/action tokens (no
 * whitespace, no `@`, bounded length) survive; anything else is dropped.
 */
export function sanitizeDescription(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return undefined;
  if (/\s/.test(trimmed) || trimmed.includes("@")) return undefined;
  return trimmed;
}
