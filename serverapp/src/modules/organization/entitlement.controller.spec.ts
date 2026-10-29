import { ForbiddenException } from "@nestjs/common";
import { EntitlementController } from "./entitlement.controller";

/**
 * Task 4.1 — owner-scoped entitlement CRUD authorization and wiring.
 * (Route-level `OrgAdminGuard` is exercised by the AppModule boot check.)
 */
function makeController() {
  const admin = {
    listActiveAddOns: jest.fn().mockReturnValue([]),
    listForOrganization: jest.fn().mockReturnValue([]),
    enableForOrganization: jest.fn().mockResolvedValue({ id: "ent-1" }),
    disableForOrganization: jest.fn().mockResolvedValue({ id: "ent-1" }),
    listForUser: jest.fn().mockReturnValue([]),
    enableForUser: jest.fn().mockResolvedValue({ id: "ent-1" }),
    disableForUser: jest.fn().mockResolvedValue({ id: "ent-1" }),
  };
  const entitlements = {
    resolve: jest.fn().mockResolvedValue({ permissions: [], modules: [] }),
  };
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };

  const controller = new EntitlementController(
    admin as any,
    entitlements as any,
    workspaceContext as any,
  );

  return { controller, admin, entitlements, workspaceContext };
}

const req = (userId = "user-1", permitName = "USER") =>
  ({ user: { id: userId, permits: { name: permitName } } }) as any;

describe("EntitlementController", () => {
  it("me resolves entitlements for the current workspace context", async () => {
    const { controller, entitlements, workspaceContext } = makeController();
    workspaceContext.getWorkspaceId.mockReturnValue("org-a");

    await controller.me(req());

    expect(entitlements.resolve).toHaveBeenCalledWith(
      "user-1",
      "org-a",
      expect.anything(),
    );
  });

  it("me resolves the personal context without a workspace", async () => {
    const { controller, entitlements } = makeController();

    await controller.me(req());

    expect(entitlements.resolve).toHaveBeenCalledWith(
      "user-1",
      null,
      expect.anything(),
    );
  });

  it("lists the active add-on catalog", () => {
    const { controller, admin } = makeController();
    controller.listAddOns();
    expect(admin.listActiveAddOns).toHaveBeenCalled();
  });

  it("enables an add-on for an organization with the actor id", async () => {
    const { controller, admin } = makeController();

    await controller.enableForOrganization(
      "org-a",
      { addOnId: "addon-1", quantity: 2 },
      req("admin-1", "CLINIC_ADMIN"),
    );

    expect(admin.enableForOrganization).toHaveBeenCalledWith(
      "org-a",
      { addOnId: "addon-1", quantity: 2 },
      "admin-1",
    );
  });

  it("disables an org entitlement", async () => {
    const { controller, admin } = makeController();

    await controller.disableForOrganization("org-a", "ent-1");

    expect(admin.disableForOrganization).toHaveBeenCalledWith("org-a", "ent-1");
  });

  it("forbids reading another user's entitlements", () => {
    const { controller } = makeController();

    expect(() => controller.listForUser(req("user-1"), "user-2")).toThrow(
      ForbiddenException,
    );
  });

  it("lets a global admin read another user's entitlements", () => {
    const { controller, admin } = makeController();

    controller.listForUser(req("admin-1", "SUPERADMIN"), "user-2");

    expect(admin.listForUser).toHaveBeenCalledWith("user-2");
  });

  it("lets the owner enable a personal entitlement", async () => {
    const { controller, admin } = makeController();

    await controller.enableForUser(req("user-1"), "user-1", {
      addOnId: "addon-1",
    });

    expect(admin.enableForUser).toHaveBeenCalledWith(
      "user-1",
      { addOnId: "addon-1" },
      "user-1",
    );
  });

  it("forbids enabling an entitlement for another user", () => {
    const { controller } = makeController();

    expect(() =>
      controller.enableForUser(req("user-1"), "user-2", { addOnId: "addon-1" }),
    ).toThrow(ForbiddenException);
  });

  it("lets the owner disable their own entitlement", async () => {
    const { controller, admin } = makeController();

    await controller.disableForUser(req("user-1"), "user-1", "ent-1");

    expect(admin.disableForUser).toHaveBeenCalledWith("user-1", "ent-1");
  });
});
