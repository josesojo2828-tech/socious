import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateUnitDto } from "./unit.dto";

/**
 * Regression: the units panel toggles `active` alone
 * (`PATCH /api/units/:id` with `{ active }`). Optional fields must carry
 * `@IsOptional()` — otherwise class-validator validates the missing
 * properties and the request fails with
 * "name must be shorter than or equal to 60 characters".
 */
const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(UpdateUnitDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

describe("UpdateUnitDto — partial updates", () => {
  it("accepts the active-only payload the units toggle sends", async () => {
    expect(await validateDto({ active: false })).toHaveLength(0);
    expect(await validateDto({ active: true })).toHaveLength(0);
  });

  it("still enforces the name length when a name is present", async () => {
    const errors = await validateDto({ name: "x".repeat(61) });
    expect(errors.some((error) => error.property === "name")).toBe(true);
  });

  it("still enforces the abbreviation length when present", async () => {
    const errors = await validateDto({ abbreviation: "x".repeat(13) });
    expect(
      errors.some((error) => error.property === "abbreviation"),
    ).toBe(true);
  });
});
