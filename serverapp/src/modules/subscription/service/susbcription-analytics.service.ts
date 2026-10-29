import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { User } from "src/shared/types/schema.types";
import {
  SubscriptionSummaryCard,
  SubscriptionByPlan,
  SubscriptionFlowData,
  LatestSubscription,
} from "../dto/subscription-analitycs.dto";
import { Prisma } from "@prisma/client";
import { RenderPieChart } from "src/shared/types/dashboard.type";
import { Logger } from "@nestjs/common";
const logger = new Logger("susbcription-analytics.service");


@Injectable()
export default class SubscriptionAnaliticsService {
  constructor(
    private prisma: PrismaService,
    private permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 💰 Obtiene el resumen de totales y MRR de suscripciones.
   * Uso: Tarjetas de resumen (Cards).
   */
  private async getSubscriptionSummary(
    lang: string,
    organizationId?: string | null,
  ): Promise<SubscriptionSummaryCard> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    // 1. OBTENER LOS CONTEOS DE SUSCRIPCIONES
    const [totalSubscriptions, activeSubscriptions] = await Promise.all([
      this.prisma.subscription.count({
        where: orgFilter,
      }),
      this.prisma.subscription.count({
        where: { status: "ACTIVE", ...orgFilter },
      }),
    ]);

    // 2. CALCULAR EL MRR (Monthly Recurring Revenue)
    const activeSubscriptionsWithPrice =
      await this.prisma.subscription.findMany({
        where: { status: "ACTIVE", ...orgFilter },
        select: {
          plan: {
            select: {
              price: true,
            },
          },
        },
      });

    // 3. Sumar en TypeScript
    const mrr = activeSubscriptionsWithPrice.reduce((sum, subscription) => {
      const price = subscription.plan?.price
        ? new Prisma.Decimal(subscription.plan.price)
        : new Prisma.Decimal(0);
      return sum.plus(price);
    }, new Prisma.Decimal(0));

    // 4. RETORNAR LAS CUSTOM CARDS
    return {
      totalSubscriptions: {
        color: "blue",
        title: this.i18n.translate("common.subscription.total", lang),
        icon: "person-lines-fill",
        value: totalSubscriptions,
      },
      activeSubscriptions: {
        color: "green",
        title: this.i18n.translate("common.subscription.active", lang),
        icon: "check-circle-fill",
        value: activeSubscriptions,
      },
      monthlyRecurringRevenue: {
        color: "purple",
        title: this.i18n.translate("common.subscription.mrr", lang),
        icon: "currency-dollar",
        value: mrr,
      },
    };
  }

  /**
   * 📊 Obtiene el conteo de suscripciones agrupadas por su Plan.
   * Uso: Gráfico de Pastel (Pie Chart) para distribución de planes.
   */
  private async getSubscriptionByPlanDistribution(
    lang: string,
    organizationId?: string | null,
  ): Promise<RenderPieChart> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    const subscriptionsByPlan = await this.prisma.subscription.groupBy({
      by: ["planId"],
      _count: { id: true },
      where: { deletedAt: null, status: "ACTIVE", ...orgFilter },
    });

    // 1. Obtener los nombres de los planes
    const planIds = subscriptionsByPlan.map((s) => s.planId);
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });

    // 2. Mapear y combinar los datos
    return {
      data: subscriptionsByPlan.map((item) => {
        const plan = plans.find((p) => p.id === item.planId);
        return {
          label: plan ? plan.name : "Plan Desconocido",
          value: item._count.id,
        };
      }),
      title: this.i18n.translate(
        "common.subscription.plan_distribution_chart",
        lang,
      ),
      id: "subscriptionPlanChart",
      keyLabel: "label",
      keyValue: "value",
    };
  }

  /**
   * 📈 Obtiene el flujo mensual de nuevas altas y cancelaciones.
   * Uso: Gráfico de Líneas (Line Chart).
   * @param months Cuántos meses históricos incluir.
   */
  private async getMonthlySubscriptionFlow(
    months: number = 6,
    lang: string,
    organizationId?: string | null,
  ): Promise<SubscriptionFlowData[]> {
    const today = new Date();
    const startMonth = new Date(
      today.getFullYear(),
      today.getMonth() - months,
      1,
    );

    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    // 1. Obtener todas las suscripciones/cancelaciones dentro del rango de tiempo
    const relevantSubscriptions = await this.prisma.subscription.findMany({
      where: {
        OR: [
          { startDate: { gte: startMonth } },
          { endDate: { gte: startMonth }, status: "CANCELED" },
        ],
        ...orgFilter,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    const flowMap: Record<
      string,
      { newSubscriptions: number; cancellations: number }
    > = {};

    // Inicializar el mapa para los últimos 'months'
    for (let i = 0; i <= months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      flowMap[key] = { newSubscriptions: 0, cancellations: 0 };
    }

    // Procesar los datos
    relevantSubscriptions.forEach((sub) => {
      // Lógica para Nuevas Suscripciones (basada en startDate)
      if (sub.startDate && sub.startDate >= startMonth) {
        const startKey = `${sub.startDate.getFullYear()}-${(sub.startDate.getMonth() + 1).toString().padStart(2, "0")}`;
        if (flowMap[startKey]) {
          flowMap[startKey].newSubscriptions += 1;
        }
      }

      // Lógica para Cancelaciones (basada en endDate y status)
      if (
        sub.status === "CANCELED" &&
        sub.endDate &&
        sub.endDate >= startMonth
      ) {
        const endKey = `${sub.endDate.getFullYear()}-${(sub.endDate.getMonth() + 1).toString().padStart(2, "0")}`;
        if (flowMap[endKey]) {
          flowMap[endKey].cancellations += 1;
        }
      }
    });

    // Convertir el mapa a un array de la interfaz SubscriptionFlowData, ordenado
    const flowData: SubscriptionFlowData[] = Object.keys(flowMap)
      .sort()
      .map((key) => ({
        month: key,
        newSubscriptions: flowMap[key].newSubscriptions,
        cancellations: flowMap[key].cancellations,
      }));

    return flowData;
  }

  /**
   * 🆕 Obtiene las 5 suscripciones más recientes.
   * Uso: Tabla de "Actividad Reciente".
   */
  private async getLatestSubscriptions(
    limit: number = 5,
    lang: string,
    organizationId?: string | null,
  ): Promise<LatestSubscription[]> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    const latestSubs = await this.prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      where: orgFilter,
      select: {
        id: true,
        status: true,
        startDate: true,
        user: { select: { fullName: true } },
        plan: { select: { name: true, price: true } },
      },
      take: limit,
    });

    // Mapear al formato de la interfaz
    return latestSubs.map((sub) => ({
      id: sub.id,
      userName: sub.user.fullName || "N/A",
      planName: sub.plan.name || "N/A",
      price: sub.plan.price,
      status: sub.status as LatestSubscription["status"],
      startDate: sub.startDate,
    }));
  }

  // ----------------------------------------------------------------
  // MÉTODO INDEX PRINCIPAL
  // ----------------------------------------------------------------

  /**
   * 📊 Método principal que ejecuta las analíticas de suscripciones según los permisos.
   */
  async index(userSession: User, lang: string, organizationId?: string | null): Promise<Record<string, any>> {
    logger.log(`[SubscriptionAnalytics] User: ${userSession.email}, organizationId: ${organizationId}`);

    const userPermits = userSession.permits.list;
    const promiseList: Promise<any>[] = [];
    const keyMap: string[] = [];

    // 1. Resumen y Distribución de Planes
    if (
      userPermits.includes(this.permitRepository.ANALYTICS_SUBSCRIPTION_SUMMARY)
    ) {
      // Ejecutamos las dos métricas principales en un Promise.all anidado
      promiseList.push(
        Promise.all([
          this.getSubscriptionSummary(lang, organizationId),
          this.getSubscriptionByPlanDistribution(lang, organizationId),
        ]),
      );
      keyMap.push(this.permitRepository.ANALYTICS_SUBSCRIPTION_SUMMARY);
    }

    // 2. Flujo Mensual y Transacciones Recientes
    if (
      userPermits.includes(this.permitRepository.ANALYTICS_SUBSCRIPTION_FLOW)
    ) {
      promiseList.push(
        Promise.all([
          this.getMonthlySubscriptionFlow(6, lang, organizationId),
          this.getLatestSubscriptions(6, lang, organizationId),
        ]),
      );
      keyMap.push(this.permitRepository.ANALYTICS_SUBSCRIPTION_FLOW);
    }

    // 3. Ejecutar todas las promesas en paralelo
    const results = await Promise.all(promiseList);

    // 4. Mapear y estructurar el resultado final
    const finalData: Record<string, any> = {};
    let resultIndex = 0;

    if (keyMap.includes(this.permitRepository.ANALYTICS_SUBSCRIPTION_SUMMARY)) {
      const [summary, distribution] = results[resultIndex++];
      finalData[this.permitRepository.ANALYTICS_SUBSCRIPTION_SUMMARY] = {
        summary,
        distribution,
      };
    }

    if (keyMap.includes(this.permitRepository.ANALYTICS_SUBSCRIPTION_FLOW)) {
      const [flow, latest] = results[resultIndex++];
      finalData[this.permitRepository.ANALYTICS_SUBSCRIPTION_FLOW] = {
        flow,
        latest,
      };
    }

    return finalData;
  }
}
