import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  ExchangeDashboardMetrics,
  GetExchangeMetricsParams,
} from "../dto/exchange-list-metrics.type";

@Injectable()
export class ExchangeMetricsService {
  constructor(private prisma: PrismaService) {}

  getEmptyMetrics(): ExchangeDashboardMetrics {
    return {
      overview: {
        totalGroups: 0,
        totalFoodItems: 0,
        mostDiverseGroup: null,
        mostDiverseCount: 0,
        avgCalories: 0,
      },
      distribution: [],
    };
  }

  async getExchangeMetrics(
    params: GetExchangeMetricsParams,
  ): Promise<ExchangeDashboardMetrics> {
    const { nutritionistId } = params;

    if (!nutritionistId) {
      return this.getEmptyMetrics();
    }

    const lists = await this.prisma.exchangeList.findMany({
      where: {
        nutritionistId,
        deletedAt: null,
        archivedAt: null,
      },
      select: {
        name: true,
        baseKcal: true,
        _count: {
          select: { items: true }, // Contamos los items relacionados
        },
      },
    });

    // --- CÁLCULOS EN MEMORIA (Rápidos con arrays pequeños) ---

    // 1. Totales Básicos
    const totalGroups = lists.length;
    const totalFoodItems = lists.reduce(
      (acc, list) => acc + list._count.items,
      0,
    );

    // 2. Grupo más diverso (Ordenamos por cantidad de items descendente)
    const sortedByCount = [...lists].sort(
      (a, b) => b._count.items - a._count.items,
    );
    const mostDiverse = sortedByCount.length > 0 ? sortedByCount[0] : null;

    // 3. Promedio Calórico de los Patrones (baseKcal)
    const sumKcal = lists.reduce((acc, list) => acc + (list.baseKcal || 0), 0);
    const avgCalories = totalGroups > 0 ? Math.round(sumKcal / totalGroups) : 0;

    // 4. Distribución para Gráficos
    const distribution = lists
      .map((list) => ({
        name: list.name,
        count: list._count.items,
        baseKcal: list.baseKcal || 0,
      }))
      .sort((a, b) => b.count - a.count); // Opcional: enviar ordenado

    return {
      overview: {
        totalGroups,
        totalFoodItems,
        mostDiverseGroup: mostDiverse?.name || null,
        mostDiverseCount: mostDiverse?._count.items || 0,
        avgCalories,
      },
      distribution,
    };
  }
}
