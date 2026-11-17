import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  FulfillmentSettingsDto,
  ShippingSettingsDto,
  UpdateTenantSettingsDto,
} from "./settings.dto";

/**
 * The merchant may turn every delivery type off: an empty list is the explicit
 * signal that orders are coordinated with the owner instead of a system flow.
 * The service layer already accepts `[]`; these tests pin the HTTP boundary
 * (the DTO) so a validation decorator cannot re-block it.
 */
describe("settings DTO — empty delivery lists", () => {
  it("accepts an empty fulfillment list", async () => {
    const dto = plainToInstance(FulfillmentSettingsDto, { enabledTypes: [] });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("still rejects an unknown fulfillment type", async () => {
    const dto = plainToInstance(FulfillmentSettingsDto, {
      enabledTypes: ["DRONE"],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isIn).toMatch(/Tipo de entrega no válido/);
  });

  it("accepts an empty agency list", async () => {
    const dto = plainToInstance(ShippingSettingsDto, { enabledAgencies: [] });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("still rejects a malformed agency key", async () => {
    const dto = plainToInstance(ShippingSettingsDto, {
      enabledAgencies: ["zoom"],
    });

    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});

/**
 * S1: el flag mayorista NO viaja en el PATCH del cliente. Vive en
 * `Organization.isWholesaler` y solo lo escribe el endpoint de plataforma.
 */
describe("settings DTO — flag mayorista fuera del alcance del cliente", () => {
  it("rechaza `wholesaler` en el body", async () => {
    const dto = plainToInstance(UpdateTenantSettingsDto, {
      wholesaler: true,
    } as unknown as object);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
