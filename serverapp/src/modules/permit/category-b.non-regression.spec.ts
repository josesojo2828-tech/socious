import * as fs from "fs";
import * as path from "path";

/**
 * Phase 8 (task 8.4) — Category B real role fields non-regression.
 *
 * The roles-permisos change refactors ONLY authenticated-user authorization
 * (Category A: `user.role` → `permits.name`). These REAL role fields are
 * Category B and MUST remain untouched and correctly typed:
 *   - `OrganizationMember.role`      → OrganizationRole
 *
 * (Socius ERP: `PatientNutritionist` and `InstitutionalCalculationCollaborator`
 * left with the nutrition domain, so their role fields are gone with them.)
 * This spec guards the Prisma schema contract (the FE `activeWorkspace.role`,
 * `WorkspaceItem.role` and portfolio `role` are covered by the documented grep
 * check in the apply-progress artifact).
 */
const SCHEMA_PATH = path.resolve(process.cwd(), "prisma/schema.prisma");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

const block = (kind: "model" | "enum", name: string): string => {
  const match = schema.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`${kind} ${name} not found in prisma/schema.prisma`);
  return match[0];
};

describe("Category B real role fields — non-regression (task 8.4)", () => {
  it("OrganizationMember keeps its OrganizationRole role field", () => {
    expect(block("model", "OrganizationMember")).toMatch(
      /role\s+OrganizationRole/,
    );
  });

  it("OrganizationRole enum keeps its members", () => {
    const orgRole = block("enum", "OrganizationRole");
    for (const value of [
      "CLINIC_ADMIN",
      "CLINIC_MANAGER",
      "NUTRITIONIST",
      "RECEPTIONIST",
    ]) {
      expect(orgRole).toContain(value);
    }
  });

});
