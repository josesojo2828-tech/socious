import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { vigente } from "./module-grant.service";

export interface WhoHasEntry {
  grantId: string;
  ownerType: "USER" | "ORGANIZATION";
  userId: string | null;
  organizationId: string | null;
  userName: string | null;
  organizationName: string | null;
  expiresAt: Date | null;
  grantedAt: Date;
  source: string;
}

export interface ModuleAdoptionMetric {
  moduleKey: string;
  name: string;
  active: boolean;
  grantedOwners: number;
  grantedUsers: number;
  grantedOrganizations: number;
  activeUsers: number;
  windowDays: number;
}

/**
 * Module stats (task 2.7): "quién tiene X" plus adoption metrics.
 *
 * All counts honour the same `vigente` predicate used by resolution, so expired
 * grants are silently excluded (no error/notification).
 */
@Injectable()
export class ModuleStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Who currently holds a grant for `moduleKey` (users and organizations). */
  async whoHas(
    moduleKey: string,
    now: Date = new Date(),
  ): Promise<WhoHasEntry[]> {
    const grants = await this.prisma.moduleGrant.findMany({
      where: { module: { key: moduleKey } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { grantedAt: "desc" },
    });

    return grants
      .filter((grant) => vigente(grant, now))
      .map((grant) => {
        const isOrg = grant.organizationId !== null;
        const userName = grant.user
          ? [grant.user.firstName, grant.user.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || grant.user.email
          : null;
        return {
          grantId: grant.id,
          ownerType: isOrg ? "ORGANIZATION" : "USER",
          userId: grant.userId,
          organizationId: grant.organizationId,
          userName,
          organizationName: grant.organization?.name ?? null,
          expiresAt: grant.expiresAt,
          grantedAt: grant.grantedAt,
          source: grant.source,
        } satisfies WhoHasEntry;
      });
  }

  /**
   * Adoption metrics per module: current grants, distinct owners, and distinct
   * users with recent activity tagged with the module key.
   */
  async adoption(
    {
      moduleKey,
      windowDays = 30,
    }: { moduleKey?: string; windowDays?: number } = {},
    now: Date = new Date(),
  ): Promise<ModuleAdoptionMetric[]> {
    const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const modules = await this.prisma.module.findMany({
      where: moduleKey ? { key: moduleKey } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const metrics: ModuleAdoptionMetric[] = [];
    for (const module of modules) {
      const grants = await this.prisma.moduleGrant.findMany({
        where: { moduleId: module.id },
        select: {
          status: true,
          expiresAt: true,
          userId: true,
          organizationId: true,
        },
      });
      const current = grants.filter((grant) => vigente(grant, now));

      const activeUsers = await this.prisma.userActivityLog.findMany({
        where: { moduleKey: module.key, createdAt: { gte: since } },
        select: { userId: true },
        distinct: ["userId"],
      });

      metrics.push({
        moduleKey: module.key,
        name: module.name,
        active: module.active,
        grantedOwners: current.length,
        grantedUsers: new Set(
          current.map((grant) => grant.userId).filter(Boolean),
        ).size,
        grantedOrganizations: new Set(
          current.map((grant) => grant.organizationId).filter(Boolean),
        ).size,
        activeUsers: activeUsers.length,
        windowDays,
      });
    }

    return metrics;
  }
}
