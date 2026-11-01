import { describe, expect, it } from "vitest";
import {
  hasActiveBranchesGrant,
  otherActiveGrantChips,
} from "./branches-grant";
import type { AdminOrganizationGrant } from "../types/organization-admin.type";

const grant = (
  moduleKey: string,
  status: string,
  id = `${moduleKey}-${status}`,
): AdminOrganizationGrant => ({ id, moduleKey, status });

describe("hasActiveBranchesGrant", () => {
  it("is ON when grants contain an ACTIVE BRANCHES row", () => {
    expect(
      hasActiveBranchesGrant([
        grant("BRANCHES", "ACTIVE"),
        grant("OFFERS", "ACTIVE"),
      ]),
    ).toBe(true);
  });

  it("is OFF when the BRANCHES grant exists but is REVOKED", () => {
    expect(hasActiveBranchesGrant([grant("BRANCHES", "REVOKED")])).toBe(false);
  });

  it("is OFF when other modules are active but BRANCHES is absent", () => {
    expect(
      hasActiveBranchesGrant([
        grant("OFFERS", "ACTIVE"),
        grant("CATALOG_ONLINE", "ACTIVE"),
      ]),
    ).toBe(false);
  });

  it("is OFF for an empty grant list", () => {
    expect(hasActiveBranchesGrant([])).toBe(false);
  });
});

describe("otherActiveGrantChips", () => {
  it("keeps every active grant except BRANCHES (read-only transparency)", () => {
    expect(
      otherActiveGrantChips([
        grant("BRANCHES", "ACTIVE"),
        grant("OFFERS", "ACTIVE"),
        grant("CATALOG_ONLINE", "ACTIVE"),
      ]),
    ).toEqual([grant("OFFERS", "ACTIVE"), grant("CATALOG_ONLINE", "ACTIVE")]);
  });

  it("drops revoked rows so the chips never advertise dead grants", () => {
    expect(
      otherActiveGrantChips([
        grant("OFFERS", "REVOKED"),
        grant("BRANCHES", "ACTIVE"),
      ]),
    ).toEqual([]);
  });
});
