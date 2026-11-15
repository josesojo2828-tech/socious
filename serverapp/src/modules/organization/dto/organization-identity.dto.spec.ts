import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateOrganizationIdentityDto } from "./organization-identity.dto";

/**
 * `PATCH /api/organizations/identity` accepts a PARTIAL identity payload.
 * The global ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`,
 * so this spec exercises the same options the HTTP layer uses.
 */
const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(UpdateOrganizationIdentityDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

const messagesFor = (errors: { property: string; constraints?: Record<string, string> }[], property: string) =>
  Object.values(errors.find((error) => error.property === property)?.constraints ?? {});

describe("UpdateOrganizationIdentityDto", () => {
  it("accepts a full valid payload", async () => {
    const errors = await validateDto({
      name: "Carnicería El Buen Corte",
      email: "hola@buencorte.com",
      phone: "+58 412 1234567",
      website: "https://buencorte.com",
      address: "Av. Principal, Local 4",
      latitude: 10.4806,
      longitude: -66.9036,
      brandPrimary: "#1A2B3C",
      brandAccent: "#a1b2c3",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    expect(errors).toHaveLength(0);
  });

  it("accepts a single-field partial update", async () => {
    expect(await validateDto({ phone: "0212-5555555" })).toHaveLength(0);
    expect(await validateDto({})).toHaveLength(0);
  });

  it("rejects unknown properties", async () => {
    const errors = await validateDto({ whatsapp: "+58 412 1234567" });

    expect(errors.some((error) => error.property === "whatsapp")).toBe(true);
  });

  it("rejects an empty name", async () => {
    const errors = await validateDto({ name: "" });

    expect(messagesFor(errors as any, "name")).toContain(
      "El nombre no puede estar vacío.",
    );
  });

  it("rejects a name longer than 120 characters", async () => {
    const errors = await validateDto({ name: "x".repeat(121) });

    expect(messagesFor(errors as any, "name")).toContain(
      "El nombre no puede exceder 120 caracteres.",
    );
  });

  it("rejects an invalid email", async () => {
    const errors = await validateDto({ email: "no-es-un-correo" });

    expect(messagesFor(errors as any, "email")).toContain(
      "El correo no es válido.",
    );
  });

  it("rejects a non-http(s) website", async () => {
    const errors = await validateDto({ website: "ftp://buencorte.com" });

    expect(messagesFor(errors as any, "website")).toContain(
      "El sitio web debe ser una URL http(s) válida.",
    );
  });

  it("rejects a brand color that is not #RRGGBB", async () => {
    const primary = await validateDto({ brandPrimary: "#FFF" });
    const accent = await validateDto({ brandAccent: "1a2b3c" });

    expect(messagesFor(primary as any, "brandPrimary")).toContain(
      "El color debe tener el formato hexadecimal #RRGGBB.",
    );
    expect(messagesFor(accent as any, "brandAccent")).toContain(
      "El color debe tener el formato hexadecimal #RRGGBB.",
    );
  });

  it("rejects a latitude outside -90..90", async () => {
    const errors = await validateDto({ latitude: 91, longitude: 0 });

    expect(messagesFor(errors as any, "latitude")).toContain(
      "La latitud debe estar entre -90 y 90.",
    );
  });

  it("rejects a longitude outside -180..180", async () => {
    const errors = await validateDto({ latitude: 0, longitude: 181 });

    expect(messagesFor(errors as any, "longitude")).toContain(
      "La longitud debe estar entre -180 y 180.",
    );
  });

  it("rejects a latitude without a longitude", async () => {
    const errors = await validateDto({ latitude: 10.5 });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("rejects a longitude without a latitude", async () => {
    const errors = await validateDto({ longitude: -66.9 });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("accepts logo URLs and root-relative paths", async () => {
    expect(
      await validateDto({ logoUrl: "https://cdn.example.com/logo.png" }),
    ).toHaveLength(0);
    expect(
      await validateDto({ logoUrl: "http://cdn.example.com/logo.png" }),
    ).toHaveLength(0);
    expect(await validateDto({ logoUrl: "/images/logo.png" })).toHaveLength(0);
  });

  it("rejects a logo that is neither http(s) nor a root-relative path", async () => {
    const errors = await validateDto({ logoUrl: "logo.png" });

    expect(messagesFor(errors as any, "logoUrl")).toContain(
      "El logo debe ser una URL http(s) o una ruta que empiece con /.",
    );
  });

  it("rejects a logo longer than 500 characters", async () => {
    const errors = await validateDto({
      logoUrl: `/${"x".repeat(500)}`,
    });

    expect(messagesFor(errors as any, "logoUrl")).toContain(
      "El logo no puede exceder 500 caracteres.",
    );
  });
});

/**
 * Clearing semantics: the identity page sends `null` to erase an optional
 * field. `null` must be accepted for the clearable strings and for the
 * coordinate pair, while `undefined` (omitted) keeps meaning "leave it".
 */
describe("UpdateOrganizationIdentityDto — clearing with explicit null", () => {
  it("accepts null for each clearable text field", async () => {
    expect(await validateDto({ email: null })).toHaveLength(0);
    expect(await validateDto({ phone: null })).toHaveLength(0);
    expect(await validateDto({ website: null })).toHaveLength(0);
    expect(await validateDto({ address: null })).toHaveLength(0);
    expect(await validateDto({ logoUrl: null })).toHaveLength(0);
  });

  it("accepts clearing the coordinates as a pair", async () => {
    expect(
      await validateDto({ latitude: null, longitude: null }),
    ).toHaveLength(0);
  });

  it("rejects a lone null latitude", async () => {
    const errors = await validateDto({ latitude: null });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("rejects a lone null longitude", async () => {
    const errors = await validateDto({ longitude: null });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("rejects a numeric latitude paired with a cleared longitude", async () => {
    const errors = await validateDto({ latitude: 10, longitude: null });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("rejects a cleared latitude paired with a numeric longitude", async () => {
    const errors = await validateDto({ latitude: null, longitude: -66.9 });

    expect(
      [...messagesFor(errors as any, "latitude"), ...messagesFor(errors as any, "longitude")],
    ).toContain("La latitud y la longitud deben enviarse juntas.");
  });

  it("does not allow clearing the required name with null", async () => {
    const errors = await validateDto({ name: null });

    expect(errors.some((error) => error.property === "name")).toBe(true);
  });

  it("does not allow clearing a brand color with null", async () => {
    const primary = await validateDto({ brandPrimary: null });
    const accent = await validateDto({ brandAccent: null });

    expect(messagesFor(primary as any, "brandPrimary")).toContain(
      "El color debe tener el formato hexadecimal #RRGGBB.",
    );
    expect(messagesFor(accent as any, "brandAccent")).toContain(
      "El color debe tener el formato hexadecimal #RRGGBB.",
    );
  });
});
