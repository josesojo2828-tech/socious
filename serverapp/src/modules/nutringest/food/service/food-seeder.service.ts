import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { FoodSource } from '@prisma/client';
import { DATA_FOOD, FOOD } from '../../../../shared/fixtures/nutrition/seed.food';
import * as fs from 'fs';
import * as path from 'path';

export interface SmaeFoodSeedInput {
  name: string;
  category?: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  baseQuantity?: number;
  externalSourceId?: string;
  aliases?: string[];
}

export interface UsdaFoodSeedInput {
  fdcId: string;
  name: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  baseQuantity?: number;
  aliases?: string[];
}

@Injectable()
export class FoodSeederService implements OnModuleInit {
  private readonly logger = new Logger(FoodSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('🌱 Iniciando seeding de alimentos e internacionalización...');
      await this.seedAllFoodData();
      this.logger.log('✅ Seeding de alimentos e internacionalización completado con éxito.');
    } catch (error) {
      this.logger.error('❌ Error durante el seeding de alimentos:', error);
    }
  }

  /**
   * Ejecuta la siembra global de alimentos y catálogos internacionales.
   */
  async seedAllFoodData(): Promise<void> {
    await this.seedGlobalBaseFoods();
    await this.seedSmaeMexicoFoods();
    await this.seedUsdaFoodData();
    await this.seedInternationalAliases();
  }

  /**
   * Lee la base de datos de alimentos global (DATA_FOOD y food-items-names.json)
   * e inserta/actualiza de forma idempotente en lotes de 50 ítems.
   */
  async seedGlobalBaseFoods(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('📦 Sembrando catálogo de alimentos GLOBAL_BASE...');

    // 1. Obtener lista combinada de alimentos
    const foodMap = new Map<string, Partial<FOOD>>();

    // Primero agregamos todos los ítems completos de DATA_FOOD
    for (const f of DATA_FOOD) {
      if (f.name && f.name.trim()) {
        foodMap.set(f.name.trim(), f);
      }
    }

    // Segundo, leemos food-items-names.json si está disponible
    const jsonPaths = [
      path.join(process.cwd(), 'scripts', 'seed-data', 'food-items-names.json'),
      path.join(process.cwd(), '..', 'scripts', 'seed-data', 'food-items-names.json'),
      path.join(__dirname, '..', '..', '..', '..', '..', 'scripts', 'seed-data', 'food-items-names.json'),
    ];

    let namesFromJson: string[] = [];
    for (const p of jsonPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          namesFromJson = JSON.parse(content);
          this.logger.log(`📄 Leídos ${namesFromJson.length} nombres desde ${p}`);
          break;
        } catch (err) {
          this.logger.warn(`No se pudo leer ${p}: ${String(err)}`);
        }
      }
    }

    // Agregar nombres de JSON que no estén en DATA_FOOD
    for (const name of namesFromJson) {
      const trimmed = name.trim();
      if (trimmed && !foodMap.has(trimmed)) {
        foodMap.set(trimmed, {
          name: trimmed,
          quantity: 100,
          calorias: 0,
          proteina: 0,
          carbohidratosTotales: 0,
          grasas: 0,
        });
      }
    }

    const allFoods = Array.from(foodMap.values());
    this.logger.log(`📊 Procesando ${allFoods.length} alimentos de base global...`);

    // 2. Procesar en lotes (batch size: 50)
    const BATCH_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < allFoods.length; i += BATCH_SIZE) {
      const batch = allFoods.slice(i, i + BATCH_SIZE);

      const transactions = batch.map((f) => {
        const name = f.name!.trim();
        const calories = f.calorias ?? 0;
        const proteins = f.proteina ?? 0;
        const carbohydrates = f.carbohidratosTotales ?? 0;
        const fats = f.grasas ?? 0;
        const baseQuantity = f.quantity ?? 100;

        return this.prisma.foodItem.upsert({
          where: { name },
          update: {
            countryCode: 'GLOBAL',
            source: FoodSource.GLOBAL_BASE,
            baseQuantity,
            calories,
            proteins,
            carbohydrates,
            fats,
            humidity: f.humed ?? 0,
            fiberTotal: f.fibraTotal ?? 0,
            calcium: f.calcio ?? 0,
            iron: f.hierro ?? 0,
            magnesium: f.magnesio ?? 0,
            zinc: f.zinc ?? 0,
            copper: f.cobre ?? 0,
            sodium: f.sodio ?? 0,
            phosphorus: f.fosforo ?? 0,
            potassium: f.potasio ?? 0,
            vitaminA: f.vitaminaA ?? 0,
            thiamin: f.tiamina ?? 0,
            riboflavin: f.riboflavina ?? 0,
            niacin: f.niacina ?? 0,
            vitaminB6: f.vitaminaB6 ?? 0,
            ascorbicAcid: f.acidAscorb ?? 0,
            isActive: true,
          },
          create: {
            name,
            createdById: null, // Alimentos globales públicos
            countryCode: 'GLOBAL',
            source: FoodSource.GLOBAL_BASE,
            baseQuantity,
            calories,
            proteins,
            carbohydrates,
            fats,
            humidity: f.humed ?? 0,
            fiberTotal: f.fibraTotal ?? 0,
            calcium: f.calcio ?? 0,
            iron: f.hierro ?? 0,
            magnesium: f.magnesio ?? 0,
            zinc: f.zinc ?? 0,
            copper: f.cobre ?? 0,
            sodium: f.sodio ?? 0,
            phosphorus: f.fosforo ?? 0,
            potassium: f.potasio ?? 0,
            vitaminA: f.vitaminaA ?? 0,
            thiamin: f.tiamina ?? 0,
            riboflavin: f.riboflavina ?? 0,
            niacin: f.niacina ?? 0,
            vitaminB6: f.vitaminaB6 ?? 0,
            ascorbicAcid: f.acidAscorb ?? 0,
            isActive: true,
          },
        });
      });

      await this.prisma.$transaction(transactions);
      processed += batch.length;
      this.logger.log(` progress: ${processed}/${allFoods.length} alimentos sembrados.`);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`✨ Seeding de GLOBAL_BASE finalizado en ${duration}ms (${processed} ítems procesados).`);
  }

  /**
   * Estructura y semilla de catálogo SMAE (México).
   */
  async seedSmaeMexicoFoods(customFoods: SmaeFoodSeedInput[] = []): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🇲🇽 Sembrando alimentos SMAE México...');

    // Catálogo inicial estructurado SMAE México
    const smaeDefaultDataset: SmaeFoodSeedInput[] = [
      { name: 'Nopal cocido (SMAE)', calories: 22, proteins: 1.4, carbohydrates: 4.5, fats: 0.2, externalSourceId: 'SMAE-001', aliases: ['Nopal', 'Nopales'] },
      { name: 'Tortilla de maíz nixtamalizado (SMAE)', calories: 64, proteins: 1.4, carbohydrates: 13.6, fats: 0.7, externalSourceId: 'SMAE-002', aliases: ['Tortilla de maíz'] },
      { name: 'Frijol negro cocido (SMAE)', calories: 132, proteins: 8.9, carbohydrates: 23.7, fats: 0.5, externalSourceId: 'SMAE-003', aliases: ['Frijoles negros'] },
      { name: 'Chile poblano (SMAE)', calories: 27, proteins: 1.5, carbohydrates: 6.2, fats: 0.3, externalSourceId: 'SMAE-004', aliases: ['Chile poblano'] },
      { name: 'Jícama picada (SMAE)', calories: 38, proteins: 0.7, carbohydrates: 8.8, fats: 0.1, externalSourceId: 'SMAE-005', aliases: ['Jícama'] },
      { name: 'Guayaba (SMAE)', calories: 68, proteins: 2.6, carbohydrates: 14.3, fats: 1.0, externalSourceId: 'SMAE-006', aliases: ['Guayaba fresca'] },
    ];

    const dataset = [...smaeDefaultDataset, ...customFoods];
    const BATCH_SIZE = 50;

    for (let i = 0; i < dataset.length; i += BATCH_SIZE) {
      const batch = dataset.slice(i, i + BATCH_SIZE);

      const transactions = batch.map((item) =>
        this.prisma.foodItem.upsert({
          where: { name: item.name },
          update: {
            countryCode: 'MX',
            source: FoodSource.SMAE_MEXICO,
            externalSourceId: item.externalSourceId ?? null,
            calories: item.calories,
            proteins: item.proteins,
            carbohydrates: item.carbohydrates,
            fats: item.fats,
            baseQuantity: item.baseQuantity ?? 100,
            isActive: true,
          },
          create: {
            name: item.name,
            createdById: null,
            countryCode: 'MX',
            source: FoodSource.SMAE_MEXICO,
            externalSourceId: item.externalSourceId ?? null,
            calories: item.calories,
            proteins: item.proteins,
            carbohydrates: item.carbohydrates,
            fats: item.fats,
            baseQuantity: item.baseQuantity ?? 100,
            isActive: true,
          },
        }),
      );

      await this.prisma.$transaction(transactions);
    }

    this.logger.log(`✨ Catálogo SMAE México procesado (${dataset.length} ítems) en ${Date.now() - startTime}ms.`);
  }

  /**
   * Estructura y semilla de catálogo USDA FoodData Central (EE. UU.).
   */
  async seedUsdaFoodData(customFoods: UsdaFoodSeedInput[] = []): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🇺🇸 Sembrando alimentos USDA FoodData Central...');

    // Catálogo inicial estructurado USDA
    const usdaDefaultDataset: UsdaFoodSeedInput[] = [
      { fdcId: '170567', name: 'Greek Yogurt Nonfat Plain (USDA)', calories: 59, proteins: 10.2, carbohydrates: 3.6, fats: 0.4, aliases: ['Yogur griego sin grasa', 'Greek Yogurt'] },
      { fdcId: '171077', name: 'Raw Peanut Butter (USDA)', calories: 588, proteins: 25.1, carbohydrates: 20.0, fats: 50.4, aliases: ['Mantequilla de maní USDA', 'Peanut butter'] },
      { fdcId: '170438', name: 'Rolled Oats Raw (USDA)', calories: 389, proteins: 16.9, carbohydrates: 66.3, fats: 6.9, aliases: ['Avena en hojuelas USDA', 'Oats'] },
      { fdcId: '175034', name: 'Chicken Breast Skinless Boneless (USDA)', calories: 165, proteins: 31.0, carbohydrates: 0.0, fats: 3.6, aliases: ['Pechuga de pollo sin piel USDA'] },
    ];

    const dataset = [...usdaDefaultDataset, ...customFoods];
    const BATCH_SIZE = 50;

    for (let i = 0; i < dataset.length; i += BATCH_SIZE) {
      const batch = dataset.slice(i, i + BATCH_SIZE);

      const transactions = batch.map((item) =>
        this.prisma.foodItem.upsert({
          where: { name: item.name },
          update: {
            countryCode: 'US',
            source: FoodSource.USDA_FOOD_DATA,
            externalSourceId: item.fdcId,
            calories: item.calories,
            proteins: item.proteins,
            carbohydrates: item.carbohydrates,
            fats: item.fats,
            baseQuantity: item.baseQuantity ?? 100,
            isActive: true,
          },
          create: {
            name: item.name,
            createdById: null,
            countryCode: 'US',
            source: FoodSource.USDA_FOOD_DATA,
            externalSourceId: item.fdcId,
            calories: item.calories,
            proteins: item.proteins,
            carbohydrates: item.carbohydrates,
            fats: item.fats,
            baseQuantity: item.baseQuantity ?? 100,
            isActive: true,
          },
        }),
      );

      await this.prisma.$transaction(transactions);
    }

    this.logger.log(`✨ Catálogo USDA procesado (${dataset.length} ítems) en ${Date.now() - startTime}ms.`);
  }

  /**
   * Semilla de alias internacionales (FoodAlias) para mapear términos regionales
   * a los alimentos estándar de la base de datos.
   */
  async seedInternationalAliases(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🌐 Sembrando alias regionales e internacionalización (FoodAlias)...');

    const aliasDefinitions: Array<{ foodName: string; countryCode: string; aliasName: string }> = [
      // Aguacate / Palta / Avocado
      { foodName: 'Aguacate', countryCode: 'MX', aliasName: 'Aguacate' },
      { foodName: 'Aguacate', countryCode: 'AR', aliasName: 'Palta' },
      { foodName: 'Aguacate', countryCode: 'CL', aliasName: 'Palta' },
      { foodName: 'Aguacate', countryCode: 'US', aliasName: 'Avocado' },

      // Cambur / Plátano / Banana / Banano
      { foodName: 'Cambur pineo', countryCode: 'VE', aliasName: 'Cambur' },
      { foodName: 'Cambur pineo', countryCode: 'MX', aliasName: 'Plátano dominico' },
      { foodName: 'Cambur pineo', countryCode: 'AR', aliasName: 'Banana' },
      { foodName: 'Cambur pineo', countryCode: 'CO', aliasName: 'Banano' },
      { foodName: 'Cambur pineo', countryCode: 'US', aliasName: 'Banana' },

      // Batata / Camote / Boniato / Sweet Potato
      { foodName: 'Batata', countryCode: 'MX', aliasName: 'Camote' },
      { foodName: 'Batata', countryCode: 'AR', aliasName: 'Batata' },
      { foodName: 'Batata', countryCode: 'UY', aliasName: 'Boniato' },
      { foodName: 'Batata', countryCode: 'US', aliasName: 'Sweet Potato' },

      // Caraotas / Frijoles / Porotos / Beans
      { foodName: 'Caraotas negras', countryCode: 'VE', aliasName: 'Caraotas negras' },
      { foodName: 'Caraotas negras', countryCode: 'MX', aliasName: 'Frijoles negros' },
      { foodName: 'Caraotas negras', countryCode: 'AR', aliasName: 'Porotos negros' },
      { foodName: 'Caraotas negras', countryCode: 'US', aliasName: 'Black beans' },

      // Auyama / Calabaza / Zapallo / Pumpkin
      { foodName: 'Auyama', countryCode: 'VE', aliasName: 'Auyama' },
      { foodName: 'Auyama', countryCode: 'MX', aliasName: 'Calabaza de castilla' },
      { foodName: 'Auyama', countryCode: 'AR', aliasName: 'Zapallo' },
      { foodName: 'Auyama', countryCode: 'US', aliasName: 'Pumpkin' },

      // Calabacín / Zucchini / Zapallito italiano
      { foodName: 'Calabacín', countryCode: 'MX', aliasName: 'Calabacita' },
      { foodName: 'Calabacín', countryCode: 'CL', aliasName: 'Zapallito italiano' },
      { foodName: 'Calabacín', countryCode: 'AR', aliasName: 'Zucchini' },
      { foodName: 'Calabacín', countryCode: 'US', aliasName: 'Zucchini' },
    ];

    let aliasCount = 0;
    const batchSize = 50;

    for (let i = 0; i < aliasDefinitions.length; i += batchSize) {
      const batch = aliasDefinitions.slice(i, i + batchSize);

      for (const def of batch) {
        const foodItem = await this.prisma.foodItem.findUnique({
          where: { name: def.foodName },
          select: { id: true },
        });

        if (foodItem) {
          const existingAlias = await this.prisma.foodAlias.findFirst({
            where: {
              foodItemId: foodItem.id,
              countryCode: def.countryCode,
              name: def.aliasName,
            },
          });

          if (!existingAlias) {
            await this.prisma.foodAlias.create({
              data: {
                foodItemId: foodItem.id,
                countryCode: def.countryCode,
                name: def.aliasName,
              },
            });
            aliasCount++;
          }
        }
      }
    }

    this.logger.log(`✨ Seeding de FoodAlias finalizado en ${Date.now() - startTime}ms (${aliasCount} nuevos alias vinculados).`);
  }
}
