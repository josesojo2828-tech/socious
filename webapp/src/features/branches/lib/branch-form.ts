import type { Branch } from "../types/branch.type";

/**
 * Branch form logic (S11): every organization is born with its default
 * branch — "Subsucursal principal" — and the merchant SEES it (feedback S4);
 * the plan capacity still counts it as the included unit.
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

/** The default branch plus the ones the owner extended. */
export function visibleBranches(branches: Branch[]): Branch[] {
  return branches;
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
