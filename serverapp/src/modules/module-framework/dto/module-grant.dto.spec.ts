import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AssignModuleGrantDto } from "./module-grant.dto";

/**
 * Task 5.2 — polymorphic owner XOR (design D2 / spec: XOR owner CHECK).
 *
 * A grant MUST have EXACTLY ONE of `userId` / `organizationId`. The DTO check
 * mirrors the DB `ModuleGrant_owner_xor_check` so a bad request is rejected with
 * a 400 before it reaches Postgres (where it would surface as a 500).
 */
const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(AssignModuleGrantDto, payload));

describe("AssignModuleGrantDto — owner XOR", () => {
  it("accepts a personal grant (userId only)", async () => {
    const errors = await validateDto({ moduleKey: "M", userId: "user-1" });
    expect(errors).toHaveLength(0);
  });

  it("accepts an organization grant (organizationId only)", async () => {
    const errors = await validateDto({
      moduleKey: "M",
      organizationId: "org-1",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects both owners at once", async () => {
    const errors = await validateDto({
      moduleKey: "M",
      userId: "user-1",
      organizationId: "org-1",
    });
    expect(errors.some((e) => e.property === "moduleKey")).toBe(true);
  });

  it("rejects when neither owner is present", async () => {
    const errors = await validateDto({ moduleKey: "M" });
    expect(errors.some((e) => e.property === "moduleKey")).toBe(true);
  });

  it("keeps accepting an optional expiry alongside a valid owner", async () => {
    const errors = await validateDto({
      moduleKey: "M",
      userId: "user-1",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    expect(errors).toHaveLength(0);
  });
});
