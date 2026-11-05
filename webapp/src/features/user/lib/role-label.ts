/**
 * Human label for the role shown in the header and the workspace switcher.
 *
 * The database still carries the nutrition-era roles (`CLINIC_ADMIN`,
 * `CLINIC_MANAGER`), so they are mapped to the ERP vocabulary instead of
 * being printed raw. `CLINIC_` is stripped first: `CLINIC_ADMIN` is an
 * organization admin, not a clinic concept.
 */

const ORGANIZATION_ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  MANAGER: "Gerente",
  CASHIER: "Cajero",
  SELLER: "Vendedor",
  WAREHOUSE: "Depósito",
  NUTRITIONIST: "Nutricionista",
  RECEPTIONIST: "Recepción",
};

export function roleLabel(input: {
  permitName?: string | null;
  workspaceType?: string | null;
  organizationRole?: string | null;
  planName?: string | null;
}): string {
  const permit = input.permitName ?? "";

  if (permit === "PATIENT") return "Paciente";

  if (input.workspaceType === "ORGANIZATION") {
    const role = (input.organizationRole ?? "").replace("CLINIC_", "");
    return ORGANIZATION_ROLE_LABELS[role] ?? "Colaborador";
  }

  if (permit === "SUPERADMIN") return "Superadmin";
  if (permit === "ADMIN") return "Administrador";

  return input.planName?.trim() || "Free";
}
