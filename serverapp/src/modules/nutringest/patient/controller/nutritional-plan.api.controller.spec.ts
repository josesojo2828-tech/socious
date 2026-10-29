import "reflect-metadata";

jest.mock("uuid", () => ({ v4: () => "00000000-0000-4000-8000-000000000000" }));

import { NutritionalPlanApiController } from "./nutritional-plan.api.controller";
import { IS_PUBLIC_KEY } from "src/shared/decorators/public.decorator";

/**
 * S2 (legal-compliance): los endpoints de planes compartidos deben estar
 * marcados @Public() para atravesar el SessionAuthGuard global, pero su
 * servicio exige isShared=true. Aquí se fija el contrato de routing.
 */
describe("NutritionalPlanApiController — contrato público (S2)", () => {
  const metaOf = (method: keyof NutritionalPlanApiController) =>
    Reflect.getMetadata(
      IS_PUBLIC_KEY,
      NutritionalPlanApiController.prototype[method],
    );

  it("getSharedPlan está marcado @Public()", () => {
    expect(metaOf("getSharedPlan")).toBe(true);
  });

  it("publicDetail está marcado @Public()", () => {
    expect(metaOf("publicDetail")).toBe(true);
  });
});
