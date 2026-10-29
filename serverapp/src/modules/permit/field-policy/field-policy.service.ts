import { Injectable, NotFoundException } from "@nestjs/common";
import { FieldAccess, FieldPolicy, OrganizationRole } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { UpsertFieldPolicyDto } from "./dto/field-policy.dto";
import {
  ResolvableMembership,
  resolveOrganizationRole,
} from "./field-policy.filter";

/** Minimal caller shape needed to resolve an organization role. */
export interface FieldPolicyUser {
  id?: string | null;
  organizationMembers?: ResolvableMembership[] | null;
}

export interface FieldPolicyFilter {
  moduleKey?: string;
  role?: OrganizationRole;
}

/**
 * Server-driven field-policy store (design D8).
 *
 * Two responsibilities:
 *  1. Read path — resolve the caller's organization role and the fields that
 *     role must NOT see (`access = HIDDEN`) for a module/form. Consumed by
 *     `FieldPolicyInterceptor`.
 *  2. Write path — admin CRUD over the `FieldPolicy` table, exposed by
 *     `FieldPolicyController`.
 *
 * Default is ALL VISIBLE: an absent policy (or no role) yields no hidden fields.
 */
@Injectable()
export class FieldPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the caller's ACTIVE `OrganizationRole` in `organizationId`.
   * Reuses the memberships already loaded on `request.user` when available and
   * falls back to a scoped query otherwise. Returns `null` (no policy) when the
   * caller is not an active member.
   */
  async resolveRole(
    user: FieldPolicyUser | null | undefined,
    organizationId: string | null,
  ): Promise<OrganizationRole | null> {
    if (!organizationId || !user?.id) return null;

    const memberships = user.organizationMembers;
    if (Array.isArray(memberships)) {
      return resolveOrganizationRole(memberships, organizationId);
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      select: { role: true, status: true },
    });

    if (!membership || membership.status !== "ACTIVE") return null;
    return membership.role;
  }

  /** Field keys marked `HIDDEN` for `role` in the module/form. */
  async getHiddenFields(
    moduleKey: string,
    role: OrganizationRole,
    formKey?: string,
  ): Promise<string[]> {
    const rows = await this.prisma.fieldPolicy.findMany({
      where: {
        moduleKey,
        role,
        access: FieldAccess.HIDDEN,
        ...(formKey ? { formKey } : {}),
      },
      select: { fieldKey: true },
    });

    return [...new Set(rows.map((row) => row.fieldKey))];
  }

  list(filter: FieldPolicyFilter): Promise<FieldPolicy[]> {
    return this.prisma.fieldPolicy.findMany({
      where: {
        ...(filter.moduleKey ? { moduleKey: filter.moduleKey } : {}),
        ...(filter.role ? { role: filter.role } : {}),
      },
      orderBy: [
        { moduleKey: "asc" },
        { role: "asc" },
        { formKey: "asc" },
        { fieldKey: "asc" },
      ],
    });
  }

  upsert(dto: UpsertFieldPolicyDto): Promise<FieldPolicy> {
    const access = dto.access ?? FieldAccess.EDITABLE;

    return this.prisma.fieldPolicy.upsert({
      where: {
        moduleKey_role_formKey_fieldKey: {
          moduleKey: dto.moduleKey,
          role: dto.role,
          formKey: dto.formKey,
          fieldKey: dto.fieldKey,
        },
      },
      update: { access },
      create: {
        moduleKey: dto.moduleKey,
        role: dto.role,
        formKey: dto.formKey,
        fieldKey: dto.fieldKey,
        access,
      },
    });
  }

  async remove(id: string): Promise<FieldPolicy> {
    const existing = await this.prisma.fieldPolicy.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("FieldPolicy no encontrada");
    }
    return this.prisma.fieldPolicy.delete({ where: { id } });
  }
}
