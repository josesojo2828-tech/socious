import { InstitutionalActivityLevel, PriceUnit } from "@prisma/client";

export interface MealCalculatedMacros {
  mealType: string;
  percentage: number;
  targetKcal: number;
  proteinPercentage: number;
  fatPercentage: number;
  carbsPercentage: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

export interface CalculationEngineResult {
  averageWeight: number;
  basePoblacional: number;
  vct: number;
  meals: MealCalculatedMacros[];
}

export interface MenuItemCostingResult {
  perCapitaCost: number;
  totalQuantity: number; // en KG
  totalCost: number;
}

export class InstitutionalCalculationEngine {
  /**
   * Paso 1: Promedio de Peso
   * Suma de la muestra de pesos de la población dividida por la cantidad de muestras.
   */
  static calculateAverageWeight(sampleWeights: number[]): number {
    if (!sampleWeights || sampleWeights.length === 0) return 0;
    const sum = sampleWeights.reduce((a, b) => a + b, 0);
    // Redondeo estándar al entero más cercano
    return Math.round(sum / sampleWeights.length);
  }

  /**
   * Paso 2: Distribución Poblacional Ajustada por Género (Base Poblacional)
   * (Mujeres + Hombres) / 2
   */
  static calculateBasePoblacional(femaleCount: number, maleCount: number): number {
    const raw = (femaleCount + maleCount) / 2;
    return Math.round(raw);
  }

  /**
   * Obtiene el factor de actividad física según el nivel de actividad.
   * Sedentario (20 kcal/kg), Moderado (30 kcal/kg), Activo (50 kcal/kg), o un factor personalizado.
   */
  static getActivityFactor(level: InstitutionalActivityLevel, customFactor?: number): number {
    switch (level) {
      case InstitutionalActivityLevel.SEDENTARY:
        return 20;
      case InstitutionalActivityLevel.MODERATE:
        return 30;
      case InstitutionalActivityLevel.ACTIVE:
        return 50;
      case InstitutionalActivityLevel.CUSTOM:
        return customFactor || 30;
      default:
        return 30;
    }
  }

  /**
   * Paso 3: Valor Calórico Total (VCT)
   * VCT = Base Poblacional * Factor de Actividad Física
   */
  static calculateVCT(basePoblacional: number, activityFactor: number): number {
    return basePoblacional * activityFactor;
  }

  /**
   * Pasos 4, 5 y 6: Cálculo de calorías y gramos de macronutrientes por comida
   */
  static calculateMealsDistribution(
    vct: number,
    mealsConfig: Array<{
      mealType: string;
      percentage: number; // ej: 35
      proteinPercentage: number; // ej: 25
      fatPercentage: number; // ej: 30
      carbsPercentage: number; // ej: 45
    }>
  ): MealCalculatedMacros[] {
    return mealsConfig.map((meal) => {
      const targetKcal = parseFloat((vct * (meal.percentage / 100)).toFixed(2));
      
      const kcalProtein = targetKcal * (meal.proteinPercentage / 100);
      const kcalFat = targetKcal * (meal.fatPercentage / 100);
      const kcalCarbs = targetKcal * (meal.carbsPercentage / 100);

      // Conversión fisiológica: proteínas (4 kcal/g), grasas (9 kcal/g), carbohidratos (4 kcal/g)
      const proteinGrams = parseFloat((kcalProtein / 4).toFixed(2));
      const fatGrams = parseFloat((kcalFat / 9).toFixed(2));
      const carbsGrams = parseFloat((kcalCarbs / 4).toFixed(2));

      return {
        mealType: meal.mealType,
        percentage: meal.percentage,
        targetKcal,
        proteinPercentage: meal.proteinPercentage,
        fatPercentage: meal.fatPercentage,
        carbsPercentage: meal.carbsPercentage,
        proteinGrams,
        fatGrams,
        carbsGrams,
      };
    });
  }

  /**
   * Pipeline de cálculo completo para la caracterización nutricional (Pasos 1 al 7)
   */
  static runCalculation(params: {
    femaleCount: number;
    maleCount: number;
    sampleWeights: number[];
    activityLevel: InstitutionalActivityLevel;
    activityFactor?: number;
    meals: Array<{
      mealType: string;
      percentage: number;
      proteinPercentage: number;
      fatPercentage: number;
      carbsPercentage: number;
    }>;
  }): CalculationEngineResult {
    const averageWeight = this.calculateAverageWeight(params.sampleWeights);
    const basePoblacional = this.calculateBasePoblacional(params.femaleCount, params.maleCount);
    const factor = this.getActivityFactor(params.activityLevel, params.activityFactor);
    const vct = this.calculateVCT(basePoblacional, factor);
    const meals = this.calculateMealsDistribution(vct, params.meals);

    return {
      averageWeight,
      basePoblacional,
      vct,
      meals,
    };
  }

  /**
   * Paso 9: Costo Per Cápita
   * Calcula el costo financiero del ingrediente en base al precio comercial y su porción asignada.
   */
  static calculateMenuItemCosting(params: {
    portionGrams: number;
    unitPrice: number;
    priceUnit: PriceUnit;
    totalPeople: number;
    wasteFactor?: number;
  }): MenuItemCostingResult {
    const { portionGrams, unitPrice, priceUnit, totalPeople, wasteFactor = 1 } = params;

    let perCapitaCost = 0;
    if (priceUnit === PriceUnit.KG || priceUnit === PriceUnit.LITER) {
      // Precio por 1000g o 1000ml
      perCapitaCost = (unitPrice / 1000) * portionGrams;
    } else {
      // Precio por unidad o porción individual
      perCapitaCost = unitPrice * portionGrams;
    }

    // Redondear a 2 decimales para dinero
    perCapitaCost = parseFloat(perCapitaCost.toFixed(2));

    // Paso 10: Compra & Presupuesto Colectivo
    // totalQuantity se expresa en KG: (porción en gramos × personas × factor de merma) / 1000
    const totalQuantity = parseFloat(((portionGrams * totalPeople * wasteFactor) / 1000).toFixed(2));
    const totalCost = parseFloat((perCapitaCost * totalPeople * wasteFactor).toFixed(2));

    return {
      perCapitaCost,
      totalQuantity,
      totalCost,
    };
  }
}
