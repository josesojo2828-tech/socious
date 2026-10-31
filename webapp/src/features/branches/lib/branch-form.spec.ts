import { describe, expect, it } from "vitest";
import {
  branchSummary,
  buildBranchPayload,
  validateBranchForm,
  visibleBranches,
} from "./branch-form";
import type { Branch } from "../types/branch.type";

const branch = (overrides: Partial<Branch> = {}): Branch => ({
  id: "b-1",
  organizationId: "o-1",
  name: "  Sucursal Norte ",
  address: "  Av. 5  ",
  isDefault: false,
  isActive: true,
  createdAt: "2026-10-30T00:00:00Z",
  ...overrides,
});

describe("branch-form (S11)", () => {
  it("trims the payload and omits an empty address", () => {
    expect(buildBranchPayload("  Norte ", "   ")).toEqual({ name: "Norte" });
    expect(buildBranchPayload("Norte", " Calle 1 ")).toEqual({
      name: "Norte",
      address: "Calle 1",
    });
  });

  it("requires a name", () => {
    expect(validateBranchForm("   ")).toMatch(/nombre/i);
    expect(validateBranchForm("Norte")).toBeNull();
  });

  it("shows the default branch next to the created ones (feedback S4)", () => {
    const branches = [
      branch({ id: "default", name: "Subsucursal principal", isDefault: true }),
      branch({ id: "norte" }),
    ];

    expect(visibleBranches(branches).map((item) => item.id)).toEqual([
      "default",
      "norte",
    ]);
    expect(visibleBranches(branches)).toHaveLength(2);
  });

  it("summarizes included vs created branches", () => {
    const summary = branchSummary([
      branch({ id: "default", isDefault: true }),
      branch({ id: "a" }),
      branch({ id: "b" }),
    ]);

    expect(summary).toEqual({ included: 1, extra: 2, total: 3 });
    expect(branchSummary([])).toEqual({ included: 0, extra: 0, total: 0 });
  });
});
