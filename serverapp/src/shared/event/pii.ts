import { createHash } from "node:crypto";

/**
 * PII hashing helpers (design D5).
 *
 * IPs MUST never be stored raw: the persistence layer stores
 * `sha256(ip + PII_HASH_SALT)` truncated to 32 hex chars (128 bits). The salt is
 * read from the `PII_HASH_SALT` env var so the digest is not brute-forceable
 * from the small IPv4 space.
 */
export const PII_HASH_SALT_ENV = "PII_HASH_SALT";

/** Digest length kept (hex chars). 32 hex chars = 128 bits. */
export const PII_HASH_LENGTH = 32;

/**
 * Returns the truncated `sha256(ip + salt)` digest, or `undefined` when there is
 * no usable IP. Never returns the raw IP.
 *
 * A missing salt still hashes (telemetry must not break) but degrades the
 * guarantee — callers should configure `PII_HASH_SALT` in every environment.
 */
export function hashIp(
  ip: string | null | undefined,
  salt: string = "",
): string | undefined {
  if (typeof ip !== "string") return undefined;
  const trimmed = ip.trim();
  if (!trimmed) return undefined;

  return createHash("sha256")
    .update(`${trimmed}${salt}`)
    .digest("hex")
    .slice(0, PII_HASH_LENGTH);
}
