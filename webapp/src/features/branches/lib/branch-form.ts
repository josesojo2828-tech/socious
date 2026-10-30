import type { Branch } from "../types/branch.type";

/**
 * Branch form logic (S11): the default branch the organization is born with
 * is never shown as a manageable row (it is the business's base, and the plan
 * counts it), so the UI only lists the branches the owner actually created.
 */

export function buildBranchPayload(
  name: string,
  address?: string,
): Record<string, string> {
  const payload: Record<string, string> = { name: name.trim() };
  const trimmed = address?.trim();
  if (trimmed) payload.address = trimmed;
  return payload;
}

export function validateBranchForm(name: string): string | null {
  if (!name?.trim()) return "El nombre de la sucursal es obligatorio.";
  return null;
}

/** The hidden default branch plus the ones the owner extended. */
export function visibleBranches(branches: Branch[]): Branch[] {
  return branches.filter((branch) => !branch.isDefault);
}

/** "1 sucursal incluida · 2 creadas" — for the summary line. */
export function branchSummary(branches: Branch[]): {
  included: number;
  extra: number;
  total: number;
} {
  const included = branches.filter((branch) => branch.isDefault).length;
  return {
    included,
    extra: branches.filter((branch) => !branch.isDefault).length,
    total: branches.length,
  };
}
