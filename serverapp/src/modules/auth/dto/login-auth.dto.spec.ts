import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterAuthDto } from "./login-auth.dto";

const VALID_PAYLOAD = {
  firstName: "Ana",
  lastName: "Diaz",
  email: "ana@nutringest.test",
  password: "secret123",
  confirmPassword: "secret123",
  birthDate: "1990-05-15",
};

async function validateRegisterDto(overrides: Record<string, unknown> = {}) {
  const dto = plainToInstance(RegisterAuthDto, {
    ...VALID_PAYLOAD,
    ...overrides,
  });
  return validate(dto);
}

/**
 * S1 (legal-compliance) — proof of consent on registration.
 *
 * The registration endpoint must reject any payload that does not carry an
 * explicit acceptance of the Terms and the Privacy Notice, because the
 * acceptance is the legal basis recorded on the created user.
 */
describe("RegisterAuthDto — aceptación de términos (S1)", () => {
  it("acepta un registro con acceptedTerms: true", async () => {
    const errors = await validateRegisterDto({ acceptedTerms: true });
    expect(errors.length).toBe(0);
  });

  it("rechaza un registro SIN acceptedTerms (prueba de consentimiento ausente)", async () => {
    const errors = await validateRegisterDto();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "acceptedTerms")).toBe(true);
  });

  it("rechaza un registro con acceptedTerms: false", async () => {
    const errors = await validateRegisterDto({ acceptedTerms: false });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "acceptedTerms")).toBe(true);
  });

  it("rechaza un registro con acceptedTerms de tipo no booleano", async () => {
    const errors = await validateRegisterDto({ acceptedTerms: "true" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "acceptedTerms")).toBe(true);
  });

  it("rechaza un registro con password sin complejidad (S6 política)", async () => {
    const errors = await validateRegisterDto({ acceptedTerms: true, password: "12345678", confirmPassword: "12345678" });
    expect(errors.some((e) => e.property === "password")).toBe(true);
  });

  it("rechaza un registro con password menor a 8 caracteres (S6 política)", async () => {
    const errors = await validateRegisterDto({ acceptedTerms: true, password: "Ab1xy", confirmPassword: "Ab1xy" });
    expect(errors.some((e) => e.property === "password")).toBe(true);
  });
});

/**
 * S7 (legal-compliance) — age gate: birthDate is required and must be a
 * valid date; the service additionally rejects minors (< 18).
 */
describe("RegisterAuthDto — gate de edad (S7)", () => {
  it("rechaza un registro SIN birthDate", async () => {
    const { birthDate: _omit, ...payload } = VALID_PAYLOAD;
    const errors = await validate(plainToInstance(RegisterAuthDto, payload));
    expect(errors.some((e) => e.property === "birthDate")).toBe(true);
  });

  it("rechaza un birthDate con formato inválido", async () => {
    const errors = await validateRegisterDto({ birthDate: "not-a-date" });
    expect(errors.some((e) => e.property === "birthDate")).toBe(true);
  });
});
