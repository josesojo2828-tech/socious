import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";
import { FieldPolicyInterceptor } from "./field-policy.interceptor";
import { FieldPolicyService } from "./field-policy.service";

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const payload = {
  records: [{ id: "a1", notes: "secret", reason: "clinical", status: "NEW" }],
};

describe("FieldPolicyInterceptor", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let fieldPolicies: {
    resolveRole: jest.Mock;
    getHiddenFields: jest.Mock;
  };
  let interceptor: FieldPolicyInterceptor;

  const run = async (context: ExecutionContext) => {
    const next = { handle: () => of(payload) };
    const result$ = await interceptor.intercept(context, next);
    return lastValueFrom(result$);
  };

  beforeEach(() => {
    process.env.ENTITLEMENTS_ENABLED = "true";
    reflector = { getAllAndOverride: jest.fn() };
    fieldPolicies = {
      resolveRole: jest.fn(),
      getHiddenFields: jest.fn(),
    };
    interceptor = new FieldPolicyInterceptor(
      reflector as unknown as Reflector,
      fieldPolicies as unknown as FieldPolicyService,
    );
  });

  afterEach(() => {
    delete process.env.ENTITLEMENTS_ENABLED;
  });

  it("is a no-op when the feature flag is off", async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
    });

    await expect(
      run(makeContext({ user: { id: "u1" }, headers: {} })),
    ).resolves.toBe(payload);
    expect(fieldPolicies.resolveRole).not.toHaveBeenCalled();
  });

  it("passes through undecorated routes without touching policies", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      run(makeContext({ user: { id: "u1" }, headers: {} })),
    ).resolves.toBe(payload);
    expect(fieldPolicies.resolveRole).not.toHaveBeenCalled();
  });

  it("passes through when there is no authenticated user", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
    });

    await expect(run(makeContext({ headers: {} }))).resolves.toBe(payload);
    expect(fieldPolicies.resolveRole).not.toHaveBeenCalled();
  });

  it("defaults to all-visible when no role resolves", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
    });
    fieldPolicies.resolveRole.mockResolvedValue(null);

    await expect(
      run(makeContext({ user: { id: "u1" }, headers: {} })),
    ).resolves.toBe(payload);
    expect(fieldPolicies.getHiddenFields).not.toHaveBeenCalled();
  });

  it("passes through when the role has no hidden fields", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
    });
    fieldPolicies.resolveRole.mockResolvedValue("NUTRITIONIST");
    fieldPolicies.getHiddenFields.mockResolvedValue([]);

    await expect(
      run(makeContext({ user: { id: "u1" }, headers: {} })),
    ).resolves.toBe(payload);
  });

  it("omits hidden fields for the restricted role", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
      formKey: "attendance.agenda",
    });
    fieldPolicies.resolveRole.mockResolvedValue("RECEPTIONIST");
    fieldPolicies.getHiddenFields.mockResolvedValue(["notes", "reason"]);

    const result = await run(
      makeContext({
        user: { id: "u1" },
        headers: { "x-workspace-id": "org-a" },
      }),
    );

    expect(result).toEqual({
      records: [{ id: "a1", status: "NEW" }],
    });
    expect(fieldPolicies.resolveRole).toHaveBeenCalledWith(
      { id: "u1" },
      "org-a",
    );
    expect(fieldPolicies.getHiddenFields).toHaveBeenCalledWith(
      "ATTENDANCE_CONTROL",
      "RECEPTIONIST",
      "attendance.agenda",
    );
  });

  it("lets different roles see different fields", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
    });
    fieldPolicies.resolveRole.mockResolvedValue("CLINIC_ADMIN");
    fieldPolicies.getHiddenFields.mockResolvedValue(["notes"]);

    const result = await run(makeContext({ user: { id: "u1" }, headers: {} }));

    expect(result).toEqual({
      records: [{ id: "a1", reason: "clinical", status: "NEW" }],
    });
  });

  it("prefers the configured route param for the organization id", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      moduleKey: "ATTENDANCE_CONTROL",
      organizationParam: "id",
    });
    fieldPolicies.resolveRole.mockResolvedValue("RECEPTIONIST");
    fieldPolicies.getHiddenFields.mockResolvedValue([]);

    await run(
      makeContext({
        user: { id: "u1" },
        params: { id: "org-from-param" },
        headers: { "x-workspace-id": "org-from-header" },
      }),
    );

    expect(fieldPolicies.resolveRole).toHaveBeenCalledWith(
      { id: "u1" },
      "org-from-param",
    );
  });
});
