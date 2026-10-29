import { ForbiddenException } from "@nestjs/common";
import { SubscriptionActiveGuard } from "./subscription-active.guard";

/**
 * Phase 8 (task 8.2) — subscription guard bypass by permit class.
 *
 * Contract under test: SUPERADMIN/ADMIN (resolved from `permits.name`) bypass
 * subscription checks; a USER with an expired subscription is blocked on
 * mutations with SUBSCRIPTION_EXPIRED_BLOCKED.
 */
const expiredSub = () => ({
  organizationId: null,
  status: "EXPIRED",
  endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  plan: { price: 10 },
});

const makeRequest = (method = "POST") =>
  ({ method, url: "/api/patients", headers: {} }) as any;

const captureError = (user: any): ForbiddenException | null => {
  try {
    SubscriptionActiveGuard.validateUserSubscription(makeRequest("POST"), user);
    return null;
  } catch (error) {
    return error as ForbiddenException;
  }
};

describe("SubscriptionActiveGuard — permit class bypass", () => {
  it("bypasses for SUPERADMIN even with an expired subscription", () => {
    const user = {
      permits: { name: "SUPERADMIN" },
      subscriptions: [expiredSub()],
    };

    expect(
      SubscriptionActiveGuard.validateUserSubscription(
        makeRequest("POST"),
        user,
      ),
    ).toBe(true);
  });

  it("bypasses for ADMIN even with an expired subscription", () => {
    const user = { permits: { name: "ADMIN" }, subscriptions: [expiredSub()] };

    expect(
      SubscriptionActiveGuard.validateUserSubscription(
        makeRequest("POST"),
        user,
      ),
    ).toBe(true);
  });

  it("blocks a USER with an expired subscription on a mutation", () => {
    const user = { permits: { name: "USER" }, subscriptions: [expiredSub()] };

    const error = captureError(user);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: "SUBSCRIPTION_EXPIRED_BLOCKED",
    });
  });

  it("still allows reads for any user", () => {
    const user = { permits: { name: "USER" }, subscriptions: [expiredSub()] };

    expect(
      SubscriptionActiveGuard.validateUserSubscription(
        makeRequest("GET"),
        user,
      ),
    ).toBe(true);
  });
});

/**
 * Task 4.5 — workspace isolation. A subscription MUST NOT be resolved from
 * another workspace via a `subscriptions[0]` fallback.
 */
describe("SubscriptionActiveGuard — workspace isolation (task 4.5)", () => {
  const workspaceRequest = (workspaceId: string) =>
    ({
      method: "POST",
      url: "/api/patients",
      headers: { "x-workspace-id": workspaceId },
    }) as any;

  it("does not enforce another workspace's expired subscription when the current workspace has none", () => {
    const user = {
      permits: { name: "USER" },
      subscriptions: [
        {
          organizationId: "org-a",
          status: "EXPIRED",
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          plan: { price: 10 },
        },
      ],
    };

    expect(
      SubscriptionActiveGuard.validateUserSubscription(
        workspaceRequest("org-b"),
        user,
      ),
    ).toBe(true);
  });

  it("still enforces the subscription that belongs to the current workspace", () => {
    const user = {
      permits: { name: "USER" },
      subscriptions: [
        {
          organizationId: "org-b",
          status: "EXPIRED",
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          plan: { price: 10 },
        },
      ],
    };

    expect(() =>
      SubscriptionActiveGuard.validateUserSubscription(
        workspaceRequest("org-b"),
        user,
      ),
    ).toThrow(ForbiddenException);
  });

  it("does not enforce an org subscription in the personal context", () => {
    const user = {
      permits: { name: "USER" },
      subscriptions: [
        {
          organizationId: "org-a",
          status: "EXPIRED",
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          plan: { price: 10 },
        },
      ],
    };

    expect(
      SubscriptionActiveGuard.validateUserSubscription(
        makeRequest("POST"),
        user,
      ),
    ).toBe(true);
  });
});
