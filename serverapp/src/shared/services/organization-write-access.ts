import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "nestjs-prisma";
import { isAdmin, type AuthzUser } from "src/modules/permit/authz";

/**
 * Tenant-level configuration (settings, identity) is an operator decision,
 * not any member's. CLINIC_ADMIN is the legacy org-admin role:
 * `module-framework` still checks it, so it keeps editing until roles are
 * audited.
 *
 * This rule is shared by `SettingsController` and the organization identity
 * surface so there is ONE role list and ONE error message.
 */
export const EDITABLE_ORGANIZATION_ROLES = [
  "OWNER",
  "ADMIN",
  "CLINIC_ADMIN",
] as const;

export interface OrganizationWriteUser extends AuthzUser {
  id: string;
}

type OrganizationMemberLookup = Pick<PrismaService, "organizationMember">;

/**
 * Allows platform admins (ADMIN/SUPERADMIN) or an ACTIVE OWNER/ADMIN/
 * CLINIC_ADMIN membership in the target organization.
 */
export async function assertCanEditOrganization(
  prisma: OrganizationMemberLookup,
  user: OrganizationWriteUser | null | undefined,
  organizationId: string,
): Promise<void> {
  if (isAdmin(user)) return;

  const membership = user
    ? await prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId,
          status: "ACTIVE",
          role: { in: [...EDITABLE_ORGANIZATION_ROLES] },
        },
        select: { id: true },
      })
    : null;

  if (!membership) {
    throw new ForbiddenException(
      "Solo el propietario o un administrador de la organización puede cambiar la configuración.",
    );
  }
}
