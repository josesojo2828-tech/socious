import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { AdminDashboardStats } from "../dto/dashboard.type";
import { Logger } from "@nestjs/common";
const logger = new Logger("admin-analytics.service");


@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene las estadísticas del dashboard admin.
   * Si se proporciona organizationId, filtra datos solo de esa organización.
   */
  async getDashboardStats(organizationId?: string | null): Promise<AdminDashboardStats> {
    logger.log(`[AdminAnalytics] organizationId: ${organizationId}`);

    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};
    logger.log(`[AdminAnalytics] orgFilter:`, orgFilter);

    // --- 1. KPIs ---

    // MRR: Suma de precios de planes activos (filtrado por organización)
    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...orgFilter,
      },
      include: { plan: true },
    });
    const mrr = activeSubs.reduce(
      (acc, sub) => acc + Number(sub.plan.price),
      0,
    );

    // Nutricionistas: Solo los que pertenecen a la organización
    let totalNutritionists: number;
    if (organizationId) {
      // Contar nutricionistas que son miembros de la organización
      const orgMembers = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          user: {
            permits: { name: "USER" },
            deletedAt: null,
            isDemo: false,
          },
        },
      });
      totalNutritionists = orgMembers.length;
    } else {
      totalNutritionists = await this.prisma.user.count({
        where: {
          permits: { name: "USER" },
          deletedAt: null,
          isDemo: false,
        },
      });
    }

    // Pacientes filtrados por organización
    const totalPatients = await this.prisma.patient.count({
      where: orgFilter,
    });

    // Consultas filtradas por organización
    const totalConsultations = await this.prisma.consultation.count({
      where: orgFilter,
    });

    // Planes nutricionales filtrados por organización
    const totalDietPlans = await this.prisma.nutritionalPlan.count({
      where: orgFilter,
    });

    // Pagos pendientes filtrados por organización
    const pendingPaymentsCount = await this.prisma.transaction.count({
      where: {
        status: TransactionStatus.PENDING,
        ...orgFilter,
      },
    });

    // Churn Rate filtrado por organización
    const totalSubs = await this.prisma.subscription.count({
      where: orgFilter,
    });
    const canceledSubs = await this.prisma.subscription.count({
      where: {
        status: {
          in: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED],
        },
        ...orgFilter,
      },
    });
    const churnRate = totalSubs > 0 ? (canceledSubs / totalSubs) * 100 : 0;

    // --- 2. CHARTS ---

    // A. Ingresos, Crecimiento de Usuarios y Actividad Clínica en últimos 6 meses
    const revenueChart: any = [];
    const userGrowthChart: any = [];
    const clinicalActivityChart: any = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthLabel = format(date, "MMMM", { locale: es });

      // Ingresos filtrados por organización
      const income = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: TransactionStatus.SUCCESS,
          type: TransactionType.PAYMENT,
          ...orgFilter,
        },
      });

      // Crecimiento de usuarios filtrado por organización
      let newUsersCount: number;
      if (organizationId) {
        // Contar usuarios nuevos en la organización
        const newOrgMembers = await this.prisma.organizationMember.findMany({
          where: {
            organizationId,
            assignedAt: { gte: start, lte: end },
            status: "ACTIVE",
            user: {
              deletedAt: null,
              isDemo: false,
            },
          },
        });
        newUsersCount = newOrgMembers.length;
      } else {
        newUsersCount = await this.prisma.user.count({
          where: {
            createdAt: { gte: start, lte: end },
            deletedAt: null,
            isDemo: false,
          },
        });
      }

      // Consultas filtradas por organización
      const consultationsCount = await this.prisma.consultation.count({
        where: {
          createdAt: { gte: start, lte: end },
          ...orgFilter,
        },
      });

      // Planes nutricionales filtrados por organización
      const plansCount = await this.prisma.nutritionalPlan.count({
        where: {
          createdAt: { gte: start, lte: end },
          ...orgFilter,
        },
      });

      revenueChart.push({
        month: monthLabel,
        income: Number(income._sum.amount || 0),
        failed: 0,
      });

      userGrowthChart.push({
        month: monthLabel,
        count: newUsersCount,
      });

      clinicalActivityChart.push({
        month: monthLabel,
        consultations: consultationsCount,
        plans: plansCount,
      });
    }

    // B. Planes filtrados por organización
    const plansGroup = await this.prisma.subscription.groupBy({
      by: ["planId"],
      _count: { id: true },
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...orgFilter,
      },
    });

    // Necesitamos los nombres de los planes
    const plansDetails = await this.prisma.subscriptionPlan.findMany();
    const pieChart = plansGroup.map((item) => {
      const plan = plansDetails.find((p) => p.id === item.planId);
      return {
        label: plan?.name || "Desconocido",
        count: item._count.id,
        color: "#36A2EB",
      };
    });

    // --- 3. TABLAS ---

    // Top Nutricionistas (Más pacientes) filtrados por organización
    let topUsers: any[];
    if (organizationId) {
      // Obtener nutricionistas de la organización ordenados por número de pacientes
      const orgNutritionists = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          user: {
            permits: { name: "USER" },
            deletedAt: null,
            isDemo: false,
          },
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              subscriptions: {
                where: { status: "ACTIVE" },
                include: { plan: true },
              },
              nutritionistProfile: {
                select: {
                  patientNutritionists: {
                    where: { isActive: true },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
        take: 5,
      });

      topUsers = orgNutritionists
        .map((member) => ({
          user: {
            username: member.user.username,
            email: member.user.email,
            subscriptions: member.user.subscriptions,
          },
          _count: {
            patientNutritionists: member.user.nutritionistProfile?.patientNutritionists?.length || 0,
          },
        }))
        .sort((a, b) => b._count.patientNutritionists - a._count.patientNutritionists);
    } else {
      topUsers = await this.prisma.nutritionist.findMany({
        take: 5,
        orderBy: {
          patientNutritionists: { _count: "desc" },
        },
        include: {
          _count: {
            select: { patientNutritionists: true },
          },
          user: {
            select: {
              username: true,
              email: true,
              subscriptions: {
                where: { status: "ACTIVE" },
                include: { plan: true },
              },
            },
          },
        },
      });
    }

    // Transacciones recientes filtradas por organización
    const recentTransactionsWhere: any = {
      createdAt: { not: undefined },
    };
    if (organizationId) {
      recentTransactionsWhere.organizationId = organizationId;
    }

    const recentTransactions = await this.prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: recentTransactionsWhere,
      include: { user: true, paymentMethod: true },
    });

    // Transacciones pendientes filtradas por organización
    const pendingTransactionsWhere: any = {
      status: TransactionStatus.PENDING,
    };
    if (organizationId) {
      pendingTransactionsWhere.organizationId = organizationId;
    }

    const pendingTransactions = await this.prisma.transaction.findMany({
      take: 10,
      where: pendingTransactionsWhere,
      orderBy: { createdAt: "desc" },
      include: { user: true, paymentMethod: true },
    });

    return {
      kpi: {
        mrr,
        totalNutritionists,
        totalPatients,
        churnRate,
        totalConsultations,
        totalDietPlans,
        pendingPaymentsCount,
      },
      charts: {
        revenueByMonth: revenueChart,
        subscriptionsByPlan: pieChart,
        userGrowth: userGrowthChart,
        clinicalActivity: clinicalActivityChart,
      },
      tables: {
        topUsers: topUsers.map((n) => ({
          name: n.user.username || n.user.email,
          patients: n._count.patientNutritionists,
          plan: n.user.subscriptions[0]?.plan?.name || "Sin plan",
        })),
        recentTransactions,
        pendingTransactions,
      },
    };
  }

  async getOfficeLocations() {
    const users = await this.prisma.user.findMany({
      where: {
        nutritionistProfile: { is: { lat: { not: null }, lng: { not: null } } },
      },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
        nutritionistProfile: { select: { lat: true, lng: true } },
      },
    });
    return {
      list: users
        .filter((u) => u.nutritionistProfile?.lat != null && u.nutritionistProfile?.lng != null)
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" "),
          email: u.email,
          lat: u.nutritionistProfile!.lat,
          lng: u.nutritionistProfile!.lng,
        })),
    };
  }
}
