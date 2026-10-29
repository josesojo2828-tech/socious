import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { SubscriptionStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { AdminDashboardStats } from "../dto/dashboard.type";

const logger = new Logger("admin-analytics.service");

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin dashboard stats.
   *
   * The JSON contract (`AdminDashboardStats`) is kept stable so existing
   * consumers keep working, but every nutrition-era metric now reads from the
   * Socius ERP data:
   *  - `totalPatients`  → clients (`Client`)
   *  - `totalConsultations` → sales (`Sale`)
   *  - `totalDietPlans` → products (`Product`)
   *  - clinical activity chart → sales vs. web orders per month
   */
  async getDashboardStats(
    organizationId?: string | null,
  ): Promise<AdminDashboardStats> {
    logger.log(`[AdminAnalytics] organizationId: ${organizationId}`);

    const orgFilter = organizationId ? { organizationId } : {};

    // --- 1. KPIs ---

    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...orgFilter,
      },
      include: { plan: true },
    });
    const mrr = activeSubs.reduce((acc, sub) => acc + Number(sub.plan.price), 0);

    // Team members: ACTIVE organization memberships (or platform users).
    let totalMembers: number;
    if (organizationId) {
      totalMembers = await this.prisma.organizationMember.count({
        where: { organizationId, status: "ACTIVE" },
      });
    } else {
      totalMembers = await this.prisma.user.count({
        where: { deletedAt: null, isDemo: false },
      });
    }

    const totalClients = await this.prisma.client.count({ where: orgFilter });
    const totalSales = await this.prisma.sale.count({ where: orgFilter });
    const totalProducts = await this.prisma.product.count({ where: orgFilter });

    const pendingPaymentsCount = await this.prisma.transaction.count({
      where: {
        status: TransactionStatus.PENDING,
        ...orgFilter,
      },
    });

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

    // --- 2. CHARTS (last 6 months) ---

    const revenueChart: AdminDashboardStats["charts"]["revenueByMonth"] = [];
    const userGrowthChart: AdminDashboardStats["charts"]["userGrowth"] = [];
    const activityChart: AdminDashboardStats["charts"]["clinicalActivity"] = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthLabel = format(date, "MMMM", { locale: es });

      const income = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: TransactionStatus.SUCCESS,
          type: TransactionType.PAYMENT,
          ...orgFilter,
        },
      });

      let newUsersCount: number;
      if (organizationId) {
        newUsersCount = await this.prisma.organizationMember.count({
          where: {
            organizationId,
            assignedAt: { gte: start, lte: end },
            status: "ACTIVE",
          },
        });
      } else {
        newUsersCount = await this.prisma.user.count({
          where: {
            createdAt: { gte: start, lte: end },
            deletedAt: null,
            isDemo: false,
          },
        });
      }

      // Business activity: sales issued and web orders received that month.
      const [salesCount, ordersCount] = await Promise.all([
        this.prisma.sale.count({
          where: { createdAt: { gte: start, lte: end }, ...orgFilter },
        }),
        this.prisma.order.count({
          where: { createdAt: { gte: start, lte: end }, ...orgFilter },
        }),
      ]);

      revenueChart.push({
        month: monthLabel,
        income: Number(income._sum.amount || 0),
        failed: 0,
      });

      userGrowthChart.push({ month: monthLabel, count: newUsersCount });

      activityChart.push({
        month: monthLabel,
        consultations: salesCount,
        plans: ordersCount,
      });
    }

    const plansGroup = await this.prisma.subscription.groupBy({
      by: ["planId"],
      _count: { id: true },
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...orgFilter,
      },
    });

    const plansDetails = await this.prisma.subscriptionPlan.findMany();
    const pieChart = plansGroup.map((item) => {
      const plan = plansDetails.find((p) => p.id === item.planId);
      return {
        label: plan?.name || "Desconocido",
        count: item._count.id,
        color: "#36A2EB",
      };
    });

    // --- 3. TABLES ---

    // Top sellers: members ranked by the number of sales they created.
    let topUsers: {
      username: string | null;
      email: string;
      sales: number;
      planName: string;
    }[];

    const topSalesQuery = this.prisma.sale.groupBy({
      by: ["createdById"],
      _count: { id: true },
      where: {
        createdById: { not: null },
        deletedAt: null,
        ...orgFilter,
      },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topSales = await topSalesQuery;
    const topUserIds = topSales
      .map((row) => row.createdById)
      .filter((id): id is string => !!id);

    const topMembers =
      topUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: topUserIds } },
            select: {
              id: true,
              username: true,
              email: true,
              subscriptions: {
                where: { status: "ACTIVE" },
                include: { plan: true },
              },
            },
          })
        : [];

    topUsers = topSales.map((row) => {
      const user = topMembers.find((u) => u.id === row.createdById);
      return {
        username: user?.username ?? null,
        email: user?.email ?? "",
        sales: row._count.id,
        planName: user?.subscriptions?.[0]?.plan?.name || "Sin plan",
      };
    });

    const recentTransactions = await this.prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: organizationId ? { organizationId } : {},
      include: { user: true, paymentMethod: true },
    });

    const pendingTransactions = await this.prisma.transaction.findMany({
      take: 10,
      where: {
        status: TransactionStatus.PENDING,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { user: true, paymentMethod: true },
    });

    return {
      kpi: {
        mrr,
        totalNutritionists: totalMembers,
        totalPatients: totalClients,
        churnRate,
        totalConsultations: totalSales,
        totalDietPlans: totalProducts,
        pendingPaymentsCount,
      },
      charts: {
        revenueByMonth: revenueChart,
        subscriptionsByPlan: pieChart,
        userGrowth: userGrowthChart,
        clinicalActivity: activityChart,
      },
      tables: {
        topUsers: topUsers.map((row) => ({
          name: row.username || row.email,
          patients: row.sales,
          plan: row.planName,
        })),
        recentTransactions,
        pendingTransactions,
      },
    };
  }

  /** Users that registered work coordinates (now stored on `UserAddress`). */
  async getOfficeLocations() {
    const addresses = await this.prisma.userAddress.findMany({
      where: {
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
        user: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: 200,
    });

    return {
      list: addresses
        .filter(
          (address) =>
            address.latitude !== null && address.longitude !== null,
        )
        .map((address) => ({
          id: address.user.id,
          fullName:
            address.user.fullName ||
            [address.user.firstName, address.user.lastName]
              .filter(Boolean)
              .join(" "),
          email: address.user.email,
          lat: address.latitude as number,
          lng: address.longitude as number,
        })),
    };
  }
}
