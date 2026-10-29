import { ForbiddenException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";

/**
 * S6 (legal-compliance): admin-only endpoints must reject authenticated
 * non-admin users, not just anonymous ones.
 */
describe("AdminGuard — admin-only endpoints (S6)", () => {
  const makeContext = (user: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  const ADMIN_USER = { permits: { name: "ADMIN" } };
  const SUPERADMIN_USER = { permits: { name: "SUPERADMIN" } };
  const NUTRITIONIST_USER = { permits: { name: "NUTRITIONIST" } };

  it("allows an ADMIN user", () => {
    const guard = new AdminGuard();
    expect(guard.canActivate(makeContext(ADMIN_USER))).toBe(true);
  });

  it("allows a SUPERADMIN user", () => {
    const guard = new AdminGuard();
    expect(guard.canActivate(makeContext(SUPERADMIN_USER))).toBe(true);
  });

  it("rejects an authenticated non-admin user with ForbiddenException", () => {
    const guard = new AdminGuard();
    expect(() => guard.canActivate(makeContext(NUTRITIONIST_USER))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects a request with no user at all", () => {
    const guard = new AdminGuard();
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects a user without permits", () => {
    const guard = new AdminGuard();
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
