/**
 * Who sees what in the configuration screen (S2/S3).
 *
 * The client runs the day-to-day and must not have to think about cash, plans,
 * delivery setup or the module switches: those live in the platform admin's
 * hands. The gate is the PLATFORM role (`permits.name`), never the workspace
 * role — a tenant `CLINIC_ADMIN` is a client too.
 */

export type PlatformUserLike =
  | {
      permitId?: string | null;
      permits?: { name?: string | null } | null;
    }
  | null
  | undefined;

const PLATFORM_ADMIN_NAMES = ["ADMIN", "SUPERADMIN"];

/** `true` only for a platform role; a tenant owner is not one. */
export function isPlatformAdmin(user: PlatformUserLike): boolean {
  if (!user) return false;
  const names = [user.permits?.name, user.permitId].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return names.some((name) => PLATFORM_ADMIN_NAMES.includes(name));
}

/** Configuration surfaces the client no longer sees. */
export type HiddenSettingsSection =
  | "cash"
  | "shipping"
  | "routes"
  | "plans"
  | "rawMaterials"
  | "services"
  | "returns"
  | "notifications"
  | "store";

export const CLIENT_HIDDEN_SECTIONS: HiddenSettingsSection[] = [
  "cash",
  "shipping",
  "routes",
  "plans",
  "rawMaterials",
  "services",
  "returns",
  "notifications",
  "store",
];

/** The admin sees every section; the client only the ones left outside S2. */
export function canSeeSettingsSection(
  section: HiddenSettingsSection,
  platformAdmin: boolean,
): boolean {
  return platformAdmin || !CLIENT_HIDDEN_SECTIONS.includes(section);
}
