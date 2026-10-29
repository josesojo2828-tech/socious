import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateSubscriptionDto } from "./user.types";

/**
 * Regression: the global ValidationPipe (src/main.ts) runs with
 * `whitelist: true` + `forbidNonWhitelisted: true`, so any body property that
 * is NOT declared on the DTO is rejected with
 * "property <name> should not exist".
 *
 * The superadmin subscription modal (webapp UpdateUserSubscriptionModal)
 * sends `ignorePayment` so an admin can change a user's plan without charging
 * their wallet; the DTO must declare it or the request fails with a 400.
 */
const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(CreateSubscriptionDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

describe("CreateSubscriptionDto — admin subscription update payload", () => {
  it("accepts the payload sent by the superadmin modal (planId + ignorePayment + autoRenew)", async () => {
    const errors = await validateDto({
      planId: "plan-1",
      ignorePayment: true,
      autoRenew: true,
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts ignorePayment: false (charge the wallet)", async () => {
    const errors = await validateDto({
      planId: "plan-1",
      ignorePayment: false,
      autoRenew: false,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects a non-boolean ignorePayment", async () => {
    const errors = await validateDto({
      planId: "plan-1",
      ignorePayment: "yes-please",
    });
    expect(errors.some((e) => e.property === "ignorePayment")).toBe(true);
  });

  it("still accepts a minimal payload (planId only)", async () => {
    const errors = await validateDto({ planId: "plan-1" });
    expect(errors).toHaveLength(0);
  });

  it("still rejects undeclared properties (whitelist stays active)", async () => {
    const errors = await validateDto({
      planId: "plan-1",
      totallyUnknownField: 1,
    });
    expect(errors.some((e) => e.property === "totallyUnknownField")).toBe(
      true,
    );
  });

  it("still requires planId", async () => {
    const errors = await validateDto({ ignorePayment: true });
    expect(errors.some((e) => e.property === "planId")).toBe(true);
  });
});
