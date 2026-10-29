import { InstitutionalCalculationEngine } from "./institutional-calculation.engine";
import { InstitutionalActivityLevel, PriceUnit } from "@prisma/client";

describe("InstitutionalCalculationEngine (Metodología de 10 Pasos)", () => {
  // Datos del benchmark del caso de estudio (Winder J. González M.)
  const benchmarkParams = {
    femaleCount: 69,
    maleCount: 50,
    totalPeople: 119,
    sampleWeights: [50, 60, 50, 51, 43, 51, 45, 50, 45], // Suma = 445
    activityLevel: InstitutionalActivityLevel.MODERATE, // Factor = 30
    meals: [
      {
        mealType: "DESAYUNO",
        percentage: 35,
        proteinPercentage: 25,
        fatPercentage: 30,
        carbsPercentage: 45,
      },
      {
        mealType: "ALMUERZO",
        percentage: 40,
        proteinPercentage: 25,
        fatPercentage: 30,
        carbsPercentage: 45,
      },
      {
        mealType: "CENA",
        percentage: 25,
        proteinPercentage: 25,
        fatPercentage: 30,
        carbsPercentage: 45,
      },
    ],
  };

  it("Paso 1: Debe calcular correctamente el peso promedio", () => {
    const avgWeight = InstitutionalCalculationEngine.calculateAverageWeight(
      benchmarkParams.sampleWeights
    );
    // 445 / 9 = 49.44. Redondeado al entero más cercano es 49.
    // Nota: El especialista redondeó manualmente a 50 kg.
    expect(avgWeight).toBe(49);
  });

  it("Paso 2: Debe calcular la distribución poblacional ajustada (Base Poblacional)", () => {
    const basePoblacional = InstitutionalCalculationEngine.calculateBasePoblacional(
      benchmarkParams.femaleCount,
      benchmarkParams.maleCount
    );
    // (69 + 50) / 2 = 59.5. Redondeado es 60.
    expect(basePoblacional).toBe(60);
  });

  it("Paso 3: Debe calcular el Valor Calórico Total (VCT)", () => {
    const factor = InstitutionalCalculationEngine.getActivityFactor(
      benchmarkParams.activityLevel
    );
    expect(factor).toBe(30);

    const vct = InstitutionalCalculationEngine.calculateVCT(60, factor);
    // 60 * 30 = 1800 Kcal
    expect(vct).toBe(1800);
  });

  it("Paso 4, 5 y 6: Debe calcular calorías y macronutrientes en gramos por comida", () => {
    const meals = InstitutionalCalculationEngine.calculateMealsDistribution(
      1800,
      benchmarkParams.meals
    );

    // Desayuno (35%) -> 630 Kcal
    const desayuno = meals.find((m) => m.mealType === "DESAYUNO");
    expect(desayuno).toBeDefined();
    expect(desayuno?.targetKcal).toBe(630);
    // Proteína (25%) -> 157.5 Kcal / 4 = 39.38 g
    expect(desayuno?.proteinGrams).toBe(39.38);
    // Grasas (30%) -> 189 Kcal / 9 = 21 g
    expect(desayuno?.fatGrams).toBe(21.0);
    // Carbs (45%) -> 283.5 Kcal / 4 = 70.88 g
    expect(desayuno?.carbsGrams).toBe(70.88);

    // Almuerzo (40%) -> 720 Kcal
    const almuerzo = meals.find((m) => m.mealType === "ALMUERZO");
    expect(almuerzo).toBeDefined();
    expect(almuerzo?.targetKcal).toBe(720);
    // Proteína (25%) -> 180 Kcal / 4 = 45 g
    expect(almuerzo?.proteinGrams).toBe(45);
    // Grasas (30%) -> 216 Kcal / 9 = 24 g
    // Nota: El especialista en su excel manual anotó 60g debido a un error de arrastre (30% de 1800 en vez de 30% de 720).
    expect(almuerzo?.fatGrams).toBe(24);
    // Carbs (45%) -> 324 Kcal / 4 = 81 g
    expect(almuerzo?.carbsGrams).toBe(81);
  });

  it("Paso 9 y 10: Debe costear correctamente un ingrediente por persona y colectivo", () => {
    // Pechuga de pollo (Desayuno Proteico)
    // Ración: 281.3g. Precio: 181.00 por KG. Personas: 119.
    const pechugaCosting = InstitutionalCalculationEngine.calculateMenuItemCosting({
      portionGrams: 281.3,
      unitPrice: 181.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
    });

    // Costo per cápita: (181 / 1000) * 281.3 = 50.9153. Redondeado a 2 decimales: 50.92
    expect(pechugaCosting.perCapitaCost).toBe(50.92);
    // Cantidad total a comprar: 281.3g * 119 personas = 33474.7g = 33.4747 kg. Redondeado a 2 decimales: 33.47
    expect(pechugaCosting.totalQuantity).toBe(33.47);
    // Costo total colectivo: 50.92 * 119 = 6059.48
    expect(pechugaCosting.totalCost).toBe(6059.48);

    // Aguacate (Desayuno Grasa)
    // Ración: 150g. Precio: 8.00 por KG. Personas: 119.
    const aguacateCosting = InstitutionalCalculationEngine.calculateMenuItemCosting({
      portionGrams: 150,
      unitPrice: 8.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
    });
    // Costo per cápita: (8 / 1000) * 150 = 1.2
    expect(aguacateCosting.perCapitaCost).toBe(1.2);
    // Costo total colectivo: 1.2 * 119 = 142.8
    expect(aguacateCosting.totalCost).toBe(142.8);
  });

  it("Paso 9 y 10: Debe costear igualmente sin wasteFactor y con wasteFactor=1", () => {
    const baseParams = {
      portionGrams: 281.3,
      unitPrice: 181.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
    };

    const sinFactor = InstitutionalCalculationEngine.calculateMenuItemCosting(baseParams);
    const conFactorUno = InstitutionalCalculationEngine.calculateMenuItemCosting({
      ...baseParams,
      wasteFactor: 1,
    });

    expect(conFactorUno.perCapitaCost).toBe(sinFactor.perCapitaCost);
    expect(conFactorUno.totalQuantity).toBe(sinFactor.totalQuantity);
    expect(conFactorUno.totalCost).toBe(sinFactor.totalCost);
    // Mismos valores del caso de estudio
    expect(conFactorUno.totalQuantity).toBe(33.47);
    expect(conFactorUno.totalCost).toBe(6059.48);
  });

  it("Paso 9 y 10: Debe aplicar el wasteFactor=1.29 a la cantidad y costo totales", () => {
    const pechugaCosting = InstitutionalCalculationEngine.calculateMenuItemCosting({
      portionGrams: 281.3,
      unitPrice: 181.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
      wasteFactor: 1.29,
    });

    // El costo per cápita no depende del factor de merma: (181 / 1000) * 281.3 = 50.92
    expect(pechugaCosting.perCapitaCost).toBe(50.92);
    // 281.3g * 119 personas * 1.29 = 43182.36g = 43.18236 kg. Redondeado a 2 decimales: 43.18
    expect(pechugaCosting.totalQuantity).toBe(43.18);
    // 50.92 * 119 * 1.29 = 7816.7292. Redondeado a 2 decimales: 7816.73
    expect(pechugaCosting.totalCost).toBe(7816.73);
  });

  it("Paso 9 y 10: Debe aplicar el wasteFactor=1.29 en un precio por unidad", () => {
    const aguacateCosting = InstitutionalCalculationEngine.calculateMenuItemCosting({
      portionGrams: 150,
      unitPrice: 8.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
      wasteFactor: 1.29,
    });

    // Costo per cápita: (8 / 1000) * 150 = 1.2
    expect(aguacateCosting.perCapitaCost).toBe(1.2);
    // 150g * 119 * 1.29 = 23026.5g = 23.0265 kg. Redondeado a 2 decimales: 23.03
    expect(aguacateCosting.totalQuantity).toBe(23.03);
    // 1.2 * 119 * 1.29 = 184.212. Redondeado a 2 decimales: 184.21
    expect(aguacateCosting.totalCost).toBe(184.21);
  });

  it("Paso 9 y 10: Debe aplicar un wasteFactor=2.5 (merma mayor) a la cantidad y costo totales", () => {
    const pechugaCosting = InstitutionalCalculationEngine.calculateMenuItemCosting({
      portionGrams: 281.3,
      unitPrice: 181.0,
      priceUnit: PriceUnit.KG,
      totalPeople: 119,
      wasteFactor: 2.5,
    });

    // 281.3g * 119 personas * 2.5 = 83686.75g = 83.68675 kg. Redondeado a 2 decimales: 83.69
    expect(pechugaCosting.totalQuantity).toBe(83.69);
    // 50.92 * 119 * 2.5 = 15148.7
    expect(pechugaCosting.totalCost).toBe(15148.7);
  });
});
