import { vigente } from "./vigente.util";

/**
 * Task 5.2 — `vigente()` / expiry (design D6 / spec: Silent Expiry).
 *
 * A grant is current ONLY IF `status === ACTIVE` AND it has no expiry or the
 * expiry is in the future. Expired grants are silently hidden (no throw).
 */
const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("vigente", () => {
  it("is true for an ACTIVE grant without expiry", () => {
    expect(vigente({ status: "ACTIVE", expiresAt: null }, NOW)).toBe(true);
  });

  it("is true for an ACTIVE grant with a future expiry", () => {
    expect(
      vigente(
        { status: "ACTIVE", expiresAt: new Date("2027-01-01T00:00:00.000Z") },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false for an ACTIVE grant whose expiry already passed", () => {
    expect(
      vigente(
        { status: "ACTIVE", expiresAt: new Date("2026-01-01T00:00:00.000Z") },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false exactly at the expiry instant (strict >)", () => {
    expect(vigente({ status: "ACTIVE", expiresAt: NOW }, NOW)).toBe(false);
  });

  it("is false for REVOKED and EXPIRED grants regardless of expiry", () => {
    expect(vigente({ status: "REVOKED", expiresAt: null }, NOW)).toBe(false);
    expect(
      vigente(
        { status: "EXPIRED", expiresAt: new Date("2027-01-01T00:00:00.000Z") },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false for a missing status", () => {
    expect(vigente({ expiresAt: null }, NOW)).toBe(false);
  });

  it("accepts ISO string expiries and treats an invalid date as not current", () => {
    expect(
      vigente({ status: "ACTIVE", expiresAt: "2027-01-01T00:00:00.000Z" }, NOW),
    ).toBe(true);
    expect(vigente({ status: "ACTIVE", expiresAt: "not-a-date" }, NOW)).toBe(
      false,
    );
  });
});
