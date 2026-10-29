enum EnergyFormula {
  mifflin,
  harrisBenedict,
  cunningham,
  katchMcardle,
}

extension EnergyFormulaExtension on EnergyFormula {
  String get displayName {
    switch (this) {
      case EnergyFormula.mifflin:
        return 'Mifflin-St Jeor';
      case EnergyFormula.harrisBenedict:
        return 'Harris-Benedict (1984)';
      case EnergyFormula.cunningham:
        return 'Cunningham (con % Grasa)';
      case EnergyFormula.katchMcardle:
        return 'Katch-McArdle (con % Grasa)';
    }
  }

  String get description {
    switch (this) {
      case EnergyFormula.mifflin:
        return 'Recomendada para población general y sobrepeso';
      case EnergyFormula.harrisBenedict:
        return 'Ecuación clásica revisada en 1984 por Roza y Shizgal';
      case EnergyFormula.cunningham:
        return 'Basada en Masa Libre de Grasa (MLG), ideal para deportistas';
      case EnergyFormula.katchMcardle:
        return 'Basada en Masa Libre de Grasa (MLG) y metabolismo basal alto';
    }
  }
}

class MacroBreakdown {
  final double kcal;
  final double grams;
  final double percent;
  final double gPerKg;

  const MacroBreakdown({
    required this.kcal,
    required this.grams,
    required this.percent,
    required this.gPerKg,
  });
}

class EnergyCalculationResult {
  final double tmb;
  final double get;
  final MacroBreakdown protein;
  final MacroBreakdown fat;
  final MacroBreakdown carbs;

  const EnergyCalculationResult({
    required this.tmb,
    required this.get,
    required this.protein,
    required this.fat,
    required this.carbs,
  });
}

class EnergyCalculator {
  static double calculateTMB({
    required EnergyFormula formula,
    required double weight,
    required double height,
    required int age,
    required bool isMale,
    double? bodyFatPercentage,
  }) {
    if (weight <= 0 || height <= 0 || age <= 0) return 0.0;

    switch (formula) {
      case EnergyFormula.mifflin:
        final genderConst = isMale ? 5.0 : -161.0;
        return (10.0 * weight) + (6.25 * height) - (5.0 * age) + genderConst;

      case EnergyFormula.harrisBenedict:
        if (isMale) {
          return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
          return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }

      case EnergyFormula.cunningham:
        final fat = bodyFatPercentage ?? 20.0;
        final mlg = weight * (1.0 - (fat / 100.0));
        return 500.0 + (22.0 * mlg);

      case EnergyFormula.katchMcardle:
        final fat = bodyFatPercentage ?? 20.0;
        final mlg = weight * (1.0 - (fat / 100.0));
        return 370.0 + (21.6 * mlg);
    }
  }

  static double calculateGET({
    required double tmb,
    required double activityFactor,
    required double stressFactor,
  }) {
    return tmb * activityFactor * stressFactor;
  }

  static EnergyCalculationResult calculateComplete({
    required EnergyFormula formula,
    required double weight,
    required double height,
    required int age,
    required bool isMale,
    double? bodyFatPercentage,
    required double activityFactor,
    required double stressFactor,
    required double proteinGPerKg,
    required double fatPercentage,
  }) {
    final tmb = calculateTMB(
      formula: formula,
      weight: weight,
      height: height,
      age: age,
      isMale: isMale,
      bodyFatPercentage: bodyFatPercentage,
    );

    final get = calculateGET(
      tmb: tmb,
      activityFactor: activityFactor,
      stressFactor: stressFactor,
    );

    final proteinGrams = proteinGPerKg * weight;
    final proteinKcal = proteinGrams * 4.0;
    final proteinPercent = get > 0 ? (proteinKcal / get) * 100.0 : 0.0;

    final fatKcal = get * (fatPercentage / 100.0);
    final fatGrams = fatKcal / 9.0;
    final fatGPerKg = weight > 0 ? fatGrams / weight : 0.0;

    final carbsKcal = get - proteinKcal - fatKcal;
    final carbsGrams = carbsKcal > 0 ? carbsKcal / 4.0 : 0.0;
    final carbsPercent = get > 0 ? (carbsKcal / get) * 100.0 : 0.0;
    final carbsGPerKg = weight > 0 ? carbsGrams / weight : 0.0;

    return EnergyCalculationResult(
      tmb: tmb,
      get: get,
      protein: MacroBreakdown(
        kcal: proteinKcal,
        grams: proteinGrams,
        percent: proteinPercent,
        gPerKg: proteinGPerKg,
      ),
      fat: MacroBreakdown(
        kcal: fatKcal,
        grams: fatGrams,
        percent: fatPercentage,
        gPerKg: fatGPerKg,
      ),
      carbs: MacroBreakdown(
        kcal: carbsKcal < 0 ? 0.0 : carbsKcal,
        grams: carbsGrams,
        percent: carbsPercent < 0 ? 0.0 : carbsPercent,
        gPerKg: carbsGPerKg < 0 ? 0.0 : carbsGPerKg,
      ),
    );
  }
}
