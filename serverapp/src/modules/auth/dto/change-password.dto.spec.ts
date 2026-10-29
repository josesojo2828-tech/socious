import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ChangePasswordDto } from "./change-password.dto";

async function validateChangePassword(payload: Record<string, unknown>) {
  const dto = plainToInstance(ChangePasswordDto, payload);
  return validate(dto);
}

/**
 * S6 (legal-compliance): the change-password endpoint must enforce a real
 * password policy (8+ chars, at least one letter and one digit), not the
 * previous untyped body with no complexity check.
 */
describe("ChangePasswordDto — política de contraseñas (S6)", () => {
  const VALID = {
    oldPassword: "CurrentPass1",
    newPassword: "NuevaClave9x",
  };

  it("acepta una contraseña que cumple la política", async () => {
    const errors = await validateChangePassword(VALID);
    expect(errors.length).toBe(0);
  });

  it("rechaza newPassword con menos de 8 caracteres", async () => {
    const errors = await validateChangePassword({
      ...VALID,
      newPassword: "Ab1xy",
    });
    expect(errors.some((e) => e.property === "newPassword")).toBe(true);
  });

  it("rechaza newPassword sin dígitos", async () => {
    const errors = await validateChangePassword({
      ...VALID,
      newPassword: "SoloLetrasXYZ",
    });
    expect(errors.some((e) => e.property === "newPassword")).toBe(true);
  });

  it("rechaza newPassword sin letras", async () => {
    const errors = await validateChangePassword({
      ...VALID,
      newPassword: "1234567890",
    });
    expect(errors.some((e) => e.property === "newPassword")).toBe(true);
  });

  it("rechaza newPassword vacía", async () => {
    const errors = await validateChangePassword({
      ...VALID,
      newPassword: "",
    });
    expect(errors.some((e) => e.property === "newPassword")).toBe(true);
  });

  it("rechaza oldPassword vacío", async () => {
    const errors = await validateChangePassword({
      ...VALID,
      oldPassword: "",
    });
    expect(errors.some((e) => e.property === "oldPassword")).toBe(true);
  });
});
