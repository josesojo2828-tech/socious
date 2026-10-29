import { isModuleFrameworkEnabled } from "./module-framework.flag";

/**
 * Task 5.1 — the `MODULE_FRAMEWORK_ENABLED` flag defaults to FALSE and only
 * the string literals `"true"` / `"1"` enable it (same contract as
 * `ENTITLEMENTS_ENABLED`).
 */
describe("isModuleFrameworkEnabled", () => {
  const ORIGINAL = process.env.MODULE_FRAMEWORK_ENABLED;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.MODULE_FRAMEWORK_ENABLED;
    } else {
      process.env.MODULE_FRAMEWORK_ENABLED = ORIGINAL;
    }
  });

  it("is disabled by default", () => {
    delete process.env.MODULE_FRAMEWORK_ENABLED;
    expect(isModuleFrameworkEnabled()).toBe(false);
  });

  it("enables on the string 'true'", () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "true";
    expect(isModuleFrameworkEnabled()).toBe(true);
  });

  it("enables on the string '1'", () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "1";
    expect(isModuleFrameworkEnabled()).toBe(true);
  });

  it("stays disabled for any other value", () => {
    for (const value of ["false", "0", "TRUE", "yes", ""]) {
      process.env.MODULE_FRAMEWORK_ENABLED = value;
      expect(isModuleFrameworkEnabled()).toBe(false);
    }
  });
});
