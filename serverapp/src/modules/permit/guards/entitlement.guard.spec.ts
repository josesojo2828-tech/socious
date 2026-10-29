import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EntitlementGuard, isEntitlementsEnabled } from "./entitlement.guard";
import { EntitlementService } from "../service/entitlement.service";
import type { ResolvedEntitlements } from "../service/entitlement-resolver";

function makeContext(request: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const resolvedWith = (permissions: string[]): ResolvedEntitlements => ({
  permissions,
  modules: [],
  fieldPolicies: {},
  organizationId: null,
});

describe("EntitlementGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let entitlements: { resolve: jest.Mock };
  let guard: EntitlementGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    entitlements = { resolve: jest.fn() };
    guard = new EntitlementGuard(
      reflector as unknown as Reflector,
      entitlements as unknown as EntitlementService,
    );
    process.env.ENTITLEMENTS_ENABLED = "true";
  });

  afterEach(() => {
    delete process.env.ENTITLEMENTS_ENABLED;
  });

  it("is disabled when the feature flag is off (no-op)", async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");

    const context = makeContext({ user: { id: "user-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("lets undecorated routes pass without resolving", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = makeContext({ user: { id: "user-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("denies a decorated route when the entitlement is missing", async () => {
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");
    entitlements.resolve.mockResolvedValue(resolvedWith(["OTHER_KEY"]));

    const context = makeContext({ user: { id: "user-1" }, headers: {} });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        code: "ENTITLEMENT_REQUIRED",
        entitlement: "ATTENDANCE_CONTROL",
      },
    });
    expect(entitlements.resolve).toHaveBeenCalledWith("user-1", null);
  });

  it("allows a decorated route when the entitlement is held", async () => {
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");
    entitlements.resolve.mockResolvedValue(
      resolvedWith(["ATTENDANCE_CONTROL"]),
    );

    const context = makeContext({ user: { id: "user-1" }, headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("passes the X-Workspace-Id header as the resolution context", async () => {
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");
    entitlements.resolve.mockResolvedValue(
      resolvedWith(["ATTENDANCE_CONTROL"]),
    );

    const context = makeContext({
      user: { id: "user-1" },
      headers: { "x-workspace-id": "org-a" },
    });

    await guard.canActivate(context);
    expect(entitlements.resolve).toHaveBeenCalledWith("user-1", "org-a");
  });

  it("reuses preloaded entitlements on the request without resolving again", async () => {
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");

    const context = makeContext({
      user: {
        id: "user-1",
        entitlements: resolvedWith(["ATTENDANCE_CONTROL"]),
      },
      headers: {},
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("denies when there is no authenticated user", async () => {
    reflector.getAllAndOverride.mockReturnValue("ATTENDANCE_CONTROL");

    const context = makeContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });
});

describe("isEntitlementsEnabled", () => {
  afterEach(() => {
    delete process.env.ENTITLEMENTS_ENABLED;
  });

  it("is false by default and for non-truthy values", () => {
    expect(isEntitlementsEnabled()).toBe(false);
    process.env.ENTITLEMENTS_ENABLED = "false";
    expect(isEntitlementsEnabled()).toBe(false);
  });

  it("accepts 'true' and '1'", () => {
    process.env.ENTITLEMENTS_ENABLED = "true";
    expect(isEntitlementsEnabled()).toBe(true);
    process.env.ENTITLEMENTS_ENABLED = "1";
    expect(isEntitlementsEnabled()).toBe(true);
  });
});
