import { Injectable } from "@nestjs/common";
import {
  RenderPieChartDto,
  BarChartDataDto,
  WalletMetricsDto,
} from "../dto/analytics-response.dto";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ---------------------------------------------------
   * WALLET: Métricas principales
   * ---------------------------------------------------
   */
  async getWalletMetrics(userId: string): Promise<WalletMetricsDto> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    // Calcular depósitos totales (EXITOSOS)
    const deposits = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
    });

    // Calcular gastos/retiros totales (EXITOSOS)
    const spent = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: { in: [TransactionType.PAYMENT, TransactionType.WITHDRAW] },
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
    });

    return {
      balance: Number(wallet?.balance || 0),
      currency: wallet?.currency || "USD",
      totalDeposited: Number(deposits._sum.amount || 0),
      totalSpent: Number(spent._sum.amount || 0),
    };
  }

  /**
   * HISTÓRICO MENSUAL (Línea de tiempo)
   * Devuelve:
   * - volume: Dinero movido (Sum of Amount)
   * - count: Cantidad de operaciones (Count of IDs)
   */
  async getMonthlyHistory(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Últimos 6 meses
    sixMonthsAgo.setDate(1); // Desde el día 1

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: sixMonthsAgo },
        status: TransactionStatus.SUCCESS, // Solo contamos las exitosas para el historial financiero
      },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: "asc" },
    });

    // Agrupación en JS (Más flexible que SQL raw para formatear fechas)
    const grouped = transactions.reduce((acc, curr) => {
      // Clave: "Mayo 2025" (Dependiendo del locale del server, mejor usar formato ISO corto o español forzado)
      const monthKey = curr.createdAt.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });

      if (!acc[monthKey]) {
        acc[monthKey] = { totalAmount: 0, totalCount: 0 };
      }

      acc[monthKey].totalAmount += Number(curr.amount);
      acc[monthKey].totalCount += 1;

      return acc;
    }, {});

    // Formatear para el frontend
    const labels = Object.keys(grouped);
    const volumeData = Object.values(grouped).map((x: any) => x.totalAmount);
    const countData = Object.values(grouped).map((x: any) => x.totalCount);

    return {
      title: "Actividad Mensual",
      labels,
      datasets: [
        { label: "Dinero Movido ($)", data: volumeData, type: "money" },
        { label: "Cant. Transacciones", data: countData, type: "count" },
      ],
    };
  }

  /**
   * ESTADO DE TRANSACCIONES (Pie/Doughnut)
   * Ej: 10 Success, 2 Pending, 1 Failed
   */
  async getTransactionStatusStats(userId: string) {
    const stats = await this.prisma.transaction.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    });

    return {
      title: "Estado de Transacciones",
      type: "doughnut",
      keyLabel: "status",
      keyValue: "count",
      data: stats.map((s) => ({ status: s.status, count: s._count.id })), // Mapeo simple
    };
  }

  /**
   * ---------------------------------------------------
   * PAYMETHODS: Uso por método (Pie Chart)
   * "¿Cual es mi método de pago más usado?"
   * ---------------------------------------------------
   */
  async getPaymentMethodUsage(userId: string): Promise<RenderPieChartDto> {
    // Agrupamos transacciones por ID de método de pago de usuario
    const usage = await this.prisma.transaction.groupBy({
      by: ["paymentMethodId"],
      where: { userId, status: TransactionStatus.SUCCESS },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5, // Top 5
    });

    // Necesitamos los nombres, no solo los IDs.
    // Hacemos un map manual porque groupBy de prisma no permite includes profundos facilmente
    const data = await Promise.all(
      usage.map(async (item) => {
        const userMethod = await this.prisma.userPaymentMethod.findUnique({
          where: { id: item.paymentMethodId },
          include: { paymentMethod: true },
        });

        // Retornamos formato limpio: "Visa ****1234" o "PayPal"
        const label = userMethod
          ? `${userMethod.paymentMethod.name}`
          : "Desconocido";

        return {
          methodName: label,
          count: item._count.id,
        };
      }),
    );

    return {
      title: "Transacciones por Método",
      type: "doughnut",
      keyLabel: "methodName",
      keyValue: "count",
      data: data,
    };
  }

  /**
   * ---------------------------------------------------
   * SUBSCRIPTIONS: Planes Populares (Global o Contextual)
   * ---------------------------------------------------
   */
  async getPopularPlans(): Promise<RenderPieChartDto> {
    // Esto es data global (social proof para el usuario)
    const stats = await this.prisma.subscription.groupBy({
      by: ["planId"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    });

    const data = await Promise.all(
      stats.map(async (item) => {
        const plan = await this.prisma.subscriptionPlan.findUnique({
          where: { id: item.planId },
        });
        return {
          planName: plan?.name || "Archived",
          activeUsers: item._count.id,
        };
      }),
    );

    return {
      title: "Planes Más Populares",
      type: "pie",
      keyLabel: "planName",
      keyValue: "activeUsers",
      data: data,
    };
  }

  /**
   * ---------------------------------------------------
   * TRANSACTIONS: Actividad (Bar Chart)
   * Últimos 6 meses de flujo de caja
   * ---------------------------------------------------
   */
  async getTransactionHistoryChart(userId: string): Promise<BarChartDataDto> {
    // Nota: Para hacerlo simple por SQL raw o lógica de JS.
    // Aquí usaré lógica JS simple sobre un fetch de datos recientes.

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: sixMonthsAgo },
        status: TransactionStatus.SUCCESS,
      },
      select: { createdAt: true, amount: true, type: true },
    });

    // Agrupar por mes "MMM-YYYY"
    const grouped = transactions.reduce((acc, curr) => {
      const month = curr.createdAt.toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      });
      if (!acc[month]) acc[month] = 0;

      // Sumamos si es deposito, restamos (o sumamos absoluto) si es gasto?
      // Usualmente en un bar chart de "Actividad" quieres ver volumen total
      acc[month] += Number(curr.amount);
      return acc;
    }, {});

    return {
      title: "Volumen de Transacciones (6 Meses)",
      labels: Object.keys(grouped),
      values: Object.values(grouped),
    };
  }

  /**
   * ---------------------------------------------------
   * TABLES: Sesiones Recientes
   * ---------------------------------------------------
   */
  async getRecentSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 10,
    });
  }

  /**
   * ---------------------------------------------------
   * TABLES: Últimas Transacciones (Payment Table)
   * ---------------------------------------------------
   */
  async getRecentTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: {
        paymentMethod: {
          include: { paymentMethod: true }, // Para obtener el nombre (Visa, etc)
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }
}
