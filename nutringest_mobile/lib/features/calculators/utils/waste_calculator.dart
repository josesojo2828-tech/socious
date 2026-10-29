class WasteCalculationResult {
  final double grossWeight; // PB (Peso Bruto)
  final double netWeight; // PN (Peso Neto)
  final double wastePercentage; // % Merma
  final double performanceFactor; // Fr = PB / PN
  final double wasteGrams; // PB - PN

  const WasteCalculationResult({
    required this.grossWeight,
    required this.netWeight,
    required this.wastePercentage,
    required this.performanceFactor,
    required this.wasteGrams,
  });
}

class WasteCalculator {
  /// Cálculo Directo: Dado PB y PN (o % de merma)
  static WasteCalculationResult calculateDirect({
    required double grossWeight,
    double? netWeight,
    double? wastePercentage,
  }) {
    if (grossWeight <= 0) {
      return const WasteCalculationResult(
        grossWeight: 0,
        netWeight: 0,
        wastePercentage: 0,
        performanceFactor: 1,
        wasteGrams: 0,
      );
    }

    double computedPN = netWeight ?? 0;
    double computedWastePct = wastePercentage ?? 0;

    if (netWeight != null && netWeight > 0) {
      computedWastePct = ((grossWeight - netWeight) / grossWeight) * 100.0;
      if (computedWastePct < 0) computedWastePct = 0;
    } else if (wastePercentage != null) {
      computedPN = grossWeight * (1.0 - (wastePercentage / 100.0));
      if (computedPN < 0) computedPN = 0;
    }

    final wasteGrams = grossWeight - computedPN;
    final performanceFactor = computedPN > 0 ? (grossWeight / computedPN) : 1.0;

    return WasteCalculationResult(
      grossWeight: grossWeight,
      netWeight: computedPN,
      wastePercentage: computedWastePct,
      performanceFactor: performanceFactor,
      wasteGrams: wasteGrams < 0 ? 0 : wasteGrams,
    );
  }

  /// Cálculo Inverso: Dado PN (deseado para la receta) y % de merma habitual
  static WasteCalculationResult calculateInverse({
    required double netWeight,
    required double wastePercentage,
  }) {
    if (netWeight <= 0) {
      return const WasteCalculationResult(
        grossWeight: 0,
        netWeight: 0,
        wastePercentage: 0,
        performanceFactor: 1,
        wasteGrams: 0,
      );
    }

    final pctFactor = (1.0 - (wastePercentage / 100.0));
    final grossWeight = pctFactor > 0 ? (netWeight / pctFactor) : netWeight;
    final wasteGrams = grossWeight - netWeight;
    final performanceFactor = netWeight > 0 ? (grossWeight / netWeight) : 1.0;

    return WasteCalculationResult(
      grossWeight: grossWeight,
      netWeight: netWeight,
      wastePercentage: wastePercentage,
      performanceFactor: performanceFactor,
      wasteGrams: wasteGrams < 0 ? 0 : wasteGrams,
    );
  }
}
