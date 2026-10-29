import { Injectable } from "@nestjs/common";
import {
  UserTotalCard,
  UsersByPermit,
  LatestUserRegistration,
  LatestUserSession,
  UserDashboardData,
} from "../dto/user-analytics.dto";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { RenderPieChart } from "src/shared/types/dashboard.type";
import { Logger } from "@nestjs/common";
const logger = new Logger("user-analytics.service");


@Injectable()
export default class UserAnaliticsService {
  constructor(
    private prisma: PrismaService,
    private permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 📊 Obtiene el resumen de totales y estados de usuarios.
   * Uso: Tarjetas de resumen (Cards) en el dashboard.
   * Nota: Excluye usuarios demo para métricas precisas.
   */
  private async getTotalSummary(lang: string, organizationId?: string | null): Promise<UserTotalCard> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    let totalUsers: number;
    let usersByStatus: any[];

    if (organizationId) {
      // Contar usuarios que son miembros de la organización
      const orgMembers = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          user: {
            deletedAt: null,
            isDemo: false,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      totalUsers = orgMembers.length;
      usersByStatus = orgMembers.reduce((acc, member) => {
        const status = member.user.status;
        const existing = acc.find((s: any) => s.status === status);
        if (existing) {
          existing._count.id++;
        } else {
          acc.push({ status, _count: { id: 1 } });
        }
        return acc;
      }, [] as any[]);
    } else {
      totalUsers = await this.prisma.user.count({
        where: { isDemo: false },
      });

      // Agrupación por estado para obtener los conteos individuales
      usersByStatus = await this.prisma.user.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { deletedAt: null, isDemo: false },
        orderBy: { status: "asc" },
      }) as any;
    }

    const activeCount =
      usersByStatus.find((s: any) => s.status === "ACTIVE")?._count.id || 0;
    const suspendedCount =
      usersByStatus.find((s: any) => s.status === "SUSPENDED")?._count.id || 0;
    const deletedCount =
      usersByStatus.find((s: any) => s.status === "DELETED")?._count.id || 0;

    return {
      total: {
        color: "blue",
        title: this.i18n.translate("common.user.total", lang),
        icon: "people",
        value: totalUsers,
      },
      active: {
        color: "green",
        title: this.i18n.translate("common.user.active", lang),
        icon: "person-check-fill",
        value: activeCount,
      },
      suspended: {
        color: "gray",
        title: this.i18n.translate("common.user.suspended", lang),
        icon: "person-fill-slash",
        value: suspendedCount,
      },
      deleted: {
        color: "red",
        title: this.i18n.translate("common.user.deleted", lang),
        icon: "person-dash-fill",
        value: deletedCount,
      },
    };
  }

  /**
   * 👥 Obtiene el conteo de usuarios agrupados por su Permit (Rol).
   * Uso: Gráfico de pastel (Pie Chart) o de dona (Doughnut Chart) para distribución de roles.
   * Nota: Excluye usuarios demo para métricas precisas.
   */
  private async getUsersByPermit(lang: string, organizationId?: string | null): Promise<RenderPieChart> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    let usersByPermit: any[];

    if (organizationId) {
      // Obtener distribución de roles en la organización
      const orgMembers = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          user: {
            deletedAt: null,
            isDemo: false,
          },
        },
        select: {
          user: {
            select: {
              permitId: true,
            },
          },
        },
      });

      // Agrupar por permitId
      const permitCounts = orgMembers.reduce((acc, member) => {
        const permitId = member.user.permitId;
        const existing = acc.find((p: any) => p.permitId === permitId);
        if (existing) {
          existing._count.id++;
        } else {
          acc.push({ permitId, _count: { id: 1 } });
        }
        return acc;
      }, [] as any[]);

      usersByPermit = permitCounts;
    } else {
      usersByPermit = await this.prisma.user.groupBy({
        by: ["permitId"],
        _count: { id: true },
        where: { deletedAt: null, isDemo: false },
        orderBy: { permitId: "asc" },
      }) as any;
    }

    // 1. Obtener los nombres de los permisos/roles
    const permitIds = usersByPermit.map((p) => p.permitId);
    const permits = await this.prisma.permit.findMany({
      where: { id: { in: permitIds } },
      select: { id: true, name: true },
    });

    // 2. Mapear y combinar los datos
    return {
      keyLabel: "permit",
      keyValue: "value",
      title: "Distribución de Usuarios por Rol",
      id: "usersByPermitChart",
      data: usersByPermit.map((item) => {
        const permit = permits.find((p) => p.id === item.permitId);
        return {
          label: permit ? permit.name : "Permiso Desconocido",
          value: item._count.id,
        };
      }),
    };
  }

  /**
   * 🆕 Obtiene los 5 usuarios registrados más recientemente.
   * Uso: Tabla de "Últimos Registros" en el dashboard.
   * Nota: Excluye usuarios demo.
   */
  private async getLatestRegistrations(
    limit: number = 5,
    lang: string,
    organizationId?: string | null,
  ): Promise<LatestUserRegistration[]> {
    let latestUsers: any[];

    if (organizationId) {
      // Obtener últimos miembros de la organización
      const orgMembers = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          user: {
            deletedAt: null,
            isDemo: false,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: limit,
      });

      latestUsers = orgMembers.map((m) => m.user);
    } else {
      latestUsers = await this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        where: { isDemo: false },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          status: true,
        },
        take: limit,
      });
    }

    return latestUsers as LatestUserRegistration[];
  }

  /**
   * 🔑 Obtiene los 5 inicios de sesión más recientes (uno por usuario).
   * Uso: Tabla de "Actividad Reciente" o "Últimos Logins".
   */
  private async getLatestSessions(
    limit: number = 5,
    lang: string,
    organizationId?: string | null,
  ): Promise<LatestUserSession[]> {
    let latestSessions: any[];

    if (organizationId) {
      // Obtener sesiones de usuarios de la organización
      const orgUserIds = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
        },
        select: { userId: true },
      });

      const userIds = orgUserIds.map((m) => m.userId);

      latestSessions = await this.prisma.userSession.findMany({
        orderBy: { startedAt: "desc" },
        distinct: ["userId"],
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          startedAt: true,
          ipAddress: true,
          device: true,
        },
        take: limit,
      });
    } else {
      latestSessions = await this.prisma.userSession.findMany({
        orderBy: { startedAt: "desc" },
        distinct: ["userId"],
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          startedAt: true,
          ipAddress: true,
          device: true,
        },
        where: { deletedAt: null },
        take: limit,
      });
    }

    return latestSessions.map((session) => ({
      userId: session.user.id,
      fullName: session.user.fullName || "",
      email: session.user.email,
      startedAt: session.startedAt,
      ipAddress: session.ipAddress || "N/A",
      device: session.device || "N/A",
    }));
  }

  // ----------------------------------------------------------------
  // MÉTODO INDEX PRINCIPAL
  // ----------------------------------------------------------------

  async index(userSession: User, lang: string, organizationId?: string | null): Promise<Record<string, any>> {
    logger.log(`[UserAnalytics] index organizationId: ${organizationId}`);

    const userPermits = userSession.permits.list;
    const promiseList: Promise<any>[] = [];
    const keyMap: string[] = [];

    // 1. Definir condicionalmente las promesas
    if (userPermits.includes(this.permitRepository.ANALYTICS_USER_CARDS)) {
      promiseList.push(this.getTotalSummary(lang, organizationId));
      keyMap.push(this.permitRepository.ANALYTICS_USER_CARDS);
    }

    if (userPermits.includes(this.permitRepository.ANALYTICS_USER__BY_PERMIT)) {
      promiseList.push(this.getUsersByPermit(lang, organizationId));
      keyMap.push(this.permitRepository.ANALYTICS_USER__BY_PERMIT);
    }

    if (
      userPermits.includes(this.permitRepository.ANALYTICS_USER_LAST_REGISTER)
    ) {
      promiseList.push(this.getLatestRegistrations(5, lang, organizationId));
      keyMap.push(this.permitRepository.ANALYTICS_USER_LAST_REGISTER);
    }

    if (
      userPermits.includes(this.permitRepository.ANALYTICS_USER_LAST_SESSION)
    ) {
      promiseList.push(this.getLatestSessions(5, lang, organizationId));
      keyMap.push(this.permitRepository.ANALYTICS_USER_LAST_SESSION);
    }

    // 2. Ejecutar todas las promesas en paralelo
    const results = await Promise.all(promiseList);

    // 3. Mapear los resultados de vuelta a su clave de permiso
    const definition: Record<string, any> = {};
    for (let i = 0; i < keyMap.length; i++) {
      definition[keyMap[i]] = results[i];
    }

    return definition;
  }
}
