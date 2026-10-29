import { isAdmin, type AuthzUser } from "@/shared/authz";

export interface OfficialAuthorUser extends AuthzUser {
  email?: string | null;
}

const OFFICIAL_EMAILS: ReadonlySet<string> = new Set([
  "nutringest@gmail.com",
  "equipo@nutringest.com",
]);

/**
 * Whether the current user may publish as an OFFICIAL Nutringest author.
 *
 * True for any `@nutringest.com` address, the two explicit team addresses, or
 * any admin (`ADMIN`/`SUPERADMIN`). The admin clause is what the previous dead
 * `user.role` check failed to provide (so admins without a company email could
 * not publish as official).
 */
export function isOfficialAuthor(
  user: OfficialAuthorUser | null | undefined,
): boolean {
  const email = (user?.email || "").toLowerCase();
  if (email.endsWith("@nutringest.com")) return true;
  if (OFFICIAL_EMAILS.has(email)) return true;
  return isAdmin(user);
}
