import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { FulfillmentSettingsDto, ShippingSettingsDto } from "./settings.dto";

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
