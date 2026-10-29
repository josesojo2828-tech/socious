import { hashIp, PII_HASH_LENGTH } from "./pii";

/**
 * Phase 7 (task 7.1) — unit coverage for IP hashing.
 * NOTE: no test runner installed yet (`node_modules` absent) — authored for
 * task 7.1, cannot execute in Phase 5.
 */
describe("pii.hashIp", () => {
  it("retorna undefined sin IP", () => {
    expect(hashIp(undefined)).toBeUndefined();
    expect(hashIp(null)).toBeUndefined();
    expect(hashIp("   ")).toBeUndefined();
  });

  it("hashea la IP y nunca devuelve el valor crudo", () => {
    const digest = hashIp("1.2.3.4", "salt");
    expect(digest).toBeDefined();
    expect(digest).not.toBe("1.2.3.4");
    expect(digest).toHaveLength(PII_HASH_LENGTH);
    expect(digest).toMatch(/^[0-9a-f]+$/);
  });

  it("es determinístico con el mismo salt", () => {
    expect(hashIp("1.2.3.4", "salt")).toBe(hashIp("1.2.3.4", "salt"));
  });

  it("cambia con distinto salt", () => {
    expect(hashIp("1.2.3.4", "a")).not.toBe(hashIp("1.2.3.4", "b"));
  });
});
