import { describe, expect, it } from "vitest";
import { resolveDashboardHome } from "./dashboard-home";

const base = {
  workspaceType: "PERSONAL" as string | null,
  isAdmin: false,
  hasUserListPermit: false,
  hasUser: true,
};

describe("resolveDashboardHome", () => {
  it("sends an organization workspace to the sales floor", () => {
    expect(resolveDashboardHome({ ...base, workspaceType: "ORGANIZATION" })).toBe(
      "org-workspace",
    );
  });

  it("sends platform admins outside an org to /dashboard/users", () => {
    expect(resolveDashboardHome({ ...base, isAdmin: true })).toBe("platform-admin");
    expect(resolveDashboardHome({ ...base, hasUserListPermit: true })).toBe(
      "platform-admin",
    );
  });

  it("prefers the organization over the admin route when both apply", () => {
    expect(
      resolveDashboardHome({
        ...base,
        workspaceType: "ORGANIZATION",
        isAdmin: true,
      }),
    ).toBe("org-workspace");
  });

  it("sends a session without a user to /login, never the landing", () => {
    expect(resolveDashboardHome({ ...base, hasUser: false })).toBe("login");
  });

  it("keeps an authenticated personal user in the dashboard", () => {
    expect(resolveDashboardHome(base)).toBe("choose-workspace");
  });

  it("keeps the personal user when the workspace is still the default", () => {
    // Regression: the workspace store defaults to PERSONAL before
    // fetchWorkspaces answers — this case must never bounce to the landing.
    expect(resolveDashboardHome({ ...base, workspaceType: undefined })).toBe(
      "choose-workspace",
    );
  });
});
