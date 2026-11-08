import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateClientDto, UpdateClientDto } from "./client.dto";

/**
 * The global ValidationPipe runs with `whitelist`, `forbidNonWhitelisted` and
 * `transform`, so these mirror the real request. Email is optional: a client
 * identified only by name, phone or document must be accepted.
 */
const validateDto = async <T extends object>(
  dto: new () => T,
  payload: Record<string, unknown>,
) =>
  validate(plainToInstance(dto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

describe("CreateClientDto — optional email", () => {
  it("accepts a client with no email at all", async () => {
    expect(await validateDto(CreateClientDto, { name: "Ana" })).toHaveLength(0);
  });

  it("accepts an empty email (the webapp used to send '')", async () => {
    expect(
      await validateDto(CreateClientDto, { name: "Ana", email: "" }),
    ).toHaveLength(0);
  });

  it("still rejects a malformed email", async () => {
    const errors = await validateDto(CreateClientDto, {
      name: "Ana",
      email: "no-es-correo",
    });

    expect(errors.some((error) => error.property === "email")).toBe(true);
  });

  it("keeps the name required", async () => {
    const errors = await validateDto(CreateClientDto, { email: "a@b.co" });
    expect(errors.some((error) => error.property === "name")).toBe(true);
  });
});

describe("UpdateClientDto — optional email", () => {
  it("accepts clearing the email", async () => {
    expect(await validateDto(UpdateClientDto, { email: "" })).toHaveLength(0);
  });
});
