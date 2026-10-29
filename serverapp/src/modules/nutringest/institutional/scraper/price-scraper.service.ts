import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { PlazasScraperStrategy } from "./plazas-scraper.strategy";

@Injectable()
export class PriceScraperService {
  private readonly logger = new Logger(PriceScraperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plazasScraper: PlazasScraperStrategy
  ) {}

  /**
   * Sincroniza el precio de un alimento específico buscando en Plaza's
   */
  async syncFoodPrice(foodId: string) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: foodId },
    });

    if (!foodItem) {
      throw new NotFoundException(`Alimento con ID ${foodId} no encontrado.`);
    }

    this.logger.log(`Iniciando sincronización de precio para: ${foodItem.name}`);

    // Ejecutar scraping
    const result = await this.plazasScraper.scrapeFoodPrice(foodItem.name);

    if (!result.success) {
      this.logger.warn(
        `No se pudo sincronizar el precio de "${foodItem.name}": ${result.error}`
      );
      return { success: false, error: result.error };
    }

    // Actualizar base de datos
    return this.prisma.$transaction(async (tx) => {
      // 1. Guardar en el histórico de precios
      await tx.foodPriceHistory.create({
        data: {
          foodId: foodItem.id,
          price: result.price,
          unit: result.unit,
          source: "PLAZAS",
        },
      });

      // 2. Actualizar el precio actual del alimento
      const updatedFood = await tx.foodItem.update({
        where: { id: foodItem.id },
        data: {
          currentPrice: result.price,
          priceUnit: result.unit,
          lastPriceSync: new Date(),
        },
      });

      return {
        success: true,
        foodId: foodItem.id,
        name: foodItem.name,
        price: result.price,
        unit: result.unit,
        rawPrice: result.rawPrice,
        rawUnitText: result.rawUnitText,
        lastPriceSync: updatedFood.lastPriceSync,
      };
    });
  }

  /**
   * Sincroniza un lote de alimentos prioritarios (e.g. proteínas e insumos básicos)
   */
  async syncAllPrices(limit = 10) {
    // Buscar alimentos que requieran sincronización o tengan sincronizaciones más viejas.
    // Restricción anti "batch destructivo": FoodItem no tiene flag institucional directo,
    // así que solo sincronizamos alimentos con ALGÚN uso (menú genérico o costo
    // institucional). Los alimentos huérfanos no se tocan. Además la relevancia del
    // scraper garantiza que nunca se escriba el precio de un producto equivocado.
    const foods = await this.prisma.foodItem.findMany({
      take: limit,
      where: {
        isActive: true,
        OR: [
          { menuItems: { some: {} } },
          { menuItemCosts: { some: {} } },
        ],
      },
      orderBy: {
        lastPriceSync: "asc",
      },
    });

    const results: Array<any> = [];
    for (const food of foods) {
      // Respetar rate limiting (delay de 2 segundos entre raspados para evitar baneos)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const res = await this.syncFoodPrice(food.id);
        results.push(res);
      } catch (err: any) {
        results.push({ foodId: food.id, success: false, error: err.message });
      }
    }

    return results;
  }
}
