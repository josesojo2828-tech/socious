import 'dart:math' as math;

enum FatFormula { yuhasz, faulkner, durninWomersley }

class IsakResult {
  final double sum6;
  final double fatPercentage;
  final double fatKg;
  final double musclePercentage;
  final double muscleKg;
  final double boneKg;
  final double residualKg;
  final double endomorphy;
  final double mesomorphy;
  final double ectomorphy;
  final double x;
  final double y;
  final String somatotypeCategory;

  const IsakResult({
    required this.sum6,
    required this.fatPercentage,
    required this.fatKg,
    required this.musclePercentage,
    required this.muscleKg,
    required this.boneKg,
    required this.residualKg,
    required this.endomorphy,
    required this.mesomorphy,
    required this.ectomorphy,
    required this.x,
    required this.y,
    required this.somatotypeCategory,
  });

  Map<String, dynamic> toJson() => {
        'sum6': sum6,
        'fatPercentage': fatPercentage,
        'fatKg': fatKg,
        'musclePercentage': musclePercentage,
        'muscleKg': muscleKg,
        'boneKg': boneKg,
        'residualKg': residualKg,
        'endomorphy': endomorphy,
        'mesomorphy': mesomorphy,
        'ectomorphy': ectomorphy,
        'x': x,
        'y': y,
        'somatotypeCategory': somatotypeCategory,
      };

  factory IsakResult.fromJson(Map<String, dynamic> json) => IsakResult(
        sum6: (json['sum6'] as num).toDouble(),
        fatPercentage: (json['fatPercentage'] as num).toDouble(),
        fatKg: (json['fatKg'] as num).toDouble(),
        musclePercentage: (json['musclePercentage'] as num).toDouble(),
        muscleKg: (json['muscleKg'] as num).toDouble(),
        boneKg: (json['boneKg'] as num).toDouble(),
        residualKg: (json['residualKg'] as num).toDouble(),
        endomorphy: (json['endomorphy'] as num).toDouble(),
        mesomorphy: (json['mesomorphy'] as num).toDouble(),
        ectomorphy: (json['ectomorphy'] as num).toDouble(),
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        somatotypeCategory: json['somatotypeCategory'] as String? ?? 'N/D',
      );
}

class IsakCalculator {
  /// Suma de 6 pliegues en mm:
  /// Tríceps, Subescapular, Supraespinal, Abdominal, Muslo anterior, Pantorrilla medial.
  static double calculateSum6({
    required double triceps,
    required double subscapular,
    required double supraspinale,
    required double abdominal,
    required double thigh,
    required double calf,
  }) {
    return triceps + subscapular + supraspinale + abdominal + thigh + calf;
  }

  /// Suma de 4 pliegues en mm (para Faulkner):
  /// Tríceps, Subescapular, Supraespinal, Abdominal.
  static double calculateSum4({
    required double triceps,
    required double subscapular,
    required double supraspinale,
    required double abdominal,
  }) {
    return triceps + subscapular + supraspinale + abdominal;
  }

  /// Porcentaje de masa grasa (% Fat) según fórmula especificada
  static double calculateBodyFatPercentage({
    required double sum6,
    required double sum4,
    required bool isMale,
    required double age,
    FatFormula formula = FatFormula.yuhasz,
  }) {
    switch (formula) {
      case FatFormula.yuhasz:
        // Yuhasz modificado (ISAK)
        if (isMale) {
          return 3.64 + (0.097 * sum6);
        } else {
          return 4.56 + (0.143 * sum6);
        }
      case FatFormula.faulkner:
        // Faulkner (utiliza suma de 4 pliegues)
        return (sum4 * 0.153) + 5.783;
      case FatFormula.durninWomersley:
        // Durnin & Womersley (1974)
        final logSum4 = math.log(sum4) / math.ln10;
        double density;
        if (isMale) {
          if (age < 20) {
            density = 1.1620 - (0.0630 * logSum4);
          } else if (age < 30) {
            density = 1.1631 - (0.0632 * logSum4);
          } else if (age < 40) {
            density = 1.1422 - (0.0544 * logSum4);
          } else if (age < 50) {
            density = 1.1620 - (0.0700 * logSum4);
          } else {
            density = 1.1715 - (0.0779 * logSum4);
          }
        } else {
          if (age < 20) {
            density = 1.1549 - (0.0678 * logSum4);
          } else if (age < 30) {
            density = 1.1599 - (0.0717 * logSum4);
          } else if (age < 40) {
            density = 1.1423 - (0.0632 * logSum4);
          } else if (age < 50) {
            density = 1.1333 - (0.0612 * logSum4);
          } else {
            density = 1.1339 - (0.0645 * logSum4);
          }
        }
        // Siri Equation
        return (4.95 / density - 4.5) * 100;
    }
  }

  /// Masa Muscular (kg & %) mediante Fórmula de Lee (2000)
  /// Lee et al. (2000): Skeletal Muscle Mass = Height * (0.00744 * CAG^2 + 0.00088 * CTG^2 + 0.00441 * CCG^2) + 2.4 * sex - 0.048 * age + 7.8
  /// sex: 1 para hombres, 0 para mujeres
  /// CAG: Perímetro de brazo corregido (cm) = arm_girth - pi * (triceps / 10)
  /// CTG: Perímetro de muslo corregido (cm) = thigh_girth - pi * (thigh / 10)
  /// CCG: Perímetro de pantorrilla corregido (cm) = calf_girth - pi * (calf / 10)
  static double calculateMuscleMassKg({
    required double heightCm,
    required double weightKg,
    required double age,
    required bool isMale,
    required double armGirthCm,
    required double tricepsMm,
    required double thighGirthCm,
    required double thighMm,
    required double calfGirthCm,
    required double calfMm,
  }) {
    if (heightCm <= 0 || weightKg <= 0) return 0.0;

    final heightM = heightCm / 100.0;
    final cag = armGirthCm - (math.pi * (tricepsMm / 10.0));
    final ctg = thighGirthCm - (math.pi * (thighMm / 10.0));
    final ccg = calfGirthCm - (math.pi * (calfMm / 10.0));

    final sexFactor = isMale ? 1.0 : 0.0;

    final muscleKg = heightM *
            (0.00744 * math.pow(cag, 2) +
                0.00088 * math.pow(ctg, 2) +
                0.00441 * math.pow(ccg, 2)) +
        (2.4 * sexFactor) -
        (0.048 * age) +
        7.8;

    return muscleKg.clamp(0.0, weightKg * 0.8);
  }

  /// Heath-Carter Somatotype Calculation
  /// Retorna un mapa con 'endomorphy', 'mesomorphy', 'ectomorphy', 'x', 'y', 'category'
  static Map<String, dynamic> calculateSomatotype({
    required double heightCm,
    required double weightKg,
    required double tricepsMm,
    required double subscapularMm,
    required double supraspinaleMm,
    required double armFlexedGirthCm,
    required double calfGirthCm,
    required double humerusDiameterCm,
    required double femurDiameterCm,
    required double calfMm,
  }) {
    if (heightCm <= 0 || weightKg <= 0) {
      return {
        'endo': 0.0,
        'meso': 0.0,
        'ecto': 0.0,
        'x': 0.0,
        'y': 0.0,
        'category': 'Sin datos',
      };
    }

    // 1. ENDOMORFIA (Ajustada por talla)
    final sum3 = (tricepsMm + subscapularMm + supraspinaleMm) * (170.18 / heightCm);
    double endo = -0.7182 + (0.1451 * sum3) - (0.00068 * math.pow(sum3, 2)) + (0.0000014 * math.pow(sum3, 3));
    if (endo < 0.1) endo = 0.1;

    // 2. MESOMORFIA
    // Perímetros corregidos
    final correctedArmGirth = armFlexedGirthCm - (tricepsMm / 10.0);
    final correctedCalfGirth = calfGirthCm - (calfMm / 10.0);

    double meso = (0.858 * humerusDiameterCm) +
        (0.601 * femurDiameterCm) +
        (0.188 * correctedArmGirth) +
        (0.161 * correctedCalfGirth) -
        (heightCm * 0.161) +
        4.0;
    if (meso < 0.1) meso = 0.1;

    // 3. ECTOMORFIA
    // Height-to-Weight Ratio (HWR)
    final hwr = heightCm / math.pow(weightKg, 1.0 / 3.0);
    double ecto;
    if (hwr >= 40.75) {
      ecto = (0.732 * hwr) - 28.58;
    } else if (hwr >= 38.25) {
      ecto = (0.463 * hwr) - 17.63;
    } else {
      ecto = 0.1;
    }
    if (ecto < 0.1) ecto = 0.1;

    // 4. Coordenadas de Somatocarta
    // X = Ectomorfia - Endomorfia
    // Y = 2 * Mesomorfia - (Endomorfia + Ectomorfia)
    final x = ecto - endo;
    final y = (2 * meso) - (endo + ecto);

    // 5. Clasificación Somatotípica
    final category = classifySomatotype(endo, meso, ecto);

    return {
      'endo': endo,
      'meso': meso,
      'ecto': ecto,
      'x': x,
      'y': y,
      'category': category,
    };
  }

  /// Clasificación de la Somatocarta según relación entre Endo, Meso y Ecto
  static String classifySomatotype(double endo, double meso, double ecto) {
    if (meso > endo && meso > ecto) {
      if (endo > ecto && (meso - endo) >= 0.5) return 'Mesomorfo-Endomorfo';
      if (ecto > endo && (meso - ecto) >= 0.5) return 'Mesomorfo-Ectomorfo';
      if (endo > ecto) return 'Endo-Mesomorfo';
      if (ecto > endo) return 'Ecto-Mesomorfo';
      return 'Mesomorfo Balanceado';
    } else if (endo > meso && endo > ecto) {
      if (meso > ecto && (endo - meso) >= 0.5) return 'Endomorfo-Mesomorfo';
      if (ecto > meso && (endo - ecto) >= 0.5) return 'Endomorfo-Ectomorfo';
      if (meso > ecto) return 'Meso-Endomorfo';
      if (ecto > meso) return 'Ecto-Endomorfo';
      return 'Endomorfo Balanceado';
    } else if (ecto > endo && ecto > meso) {
      if (meso > endo && (ecto - meso) >= 0.5) return 'Ectomorfo-Mesomorfo';
      if (endo > meso && (ecto - endo) >= 0.5) return 'Ectomorfo-Endomorfo';
      if (meso > endo) return 'Meso-Ectomorfo';
      if (endo > meso) return 'Endo-Ectomorfo';
      return 'Ectomorfo Balanceado';
    } else {
      return 'Somatotipo Central';
    }
  }

  /// Método integrador completo de cálculo ISAK
  static IsakResult computeFullIsak({
    required double weightKg,
    required double heightCm,
    required double age,
    required bool isMale,
    required double tricepsMm,
    required double subscapularMm,
    required double supraspinaleMm,
    required double abdominalMm,
    required double thighMm,
    required double calfMm,
    required double armRelaxedGirthCm,
    required double armFlexedGirthCm,
    required double waistGirthCm,
    required double hipGirthCm,
    required double thighGirthCm,
    required double calfGirthCm,
    required double humerusDiameterCm,
    required double femurDiameterCm,
    required double wristDiameterCm,
    FatFormula formula = FatFormula.yuhasz,
  }) {
    final sum6 = calculateSum6(
      triceps: tricepsMm,
      subscapular: subscapularMm,
      supraspinale: supraspinaleMm,
      abdominal: abdominalMm,
      thigh: thighMm,
      calf: calfMm,
    );

    final sum4 = calculateSum4(
      triceps: tricepsMm,
      subscapular: subscapularMm,
      supraspinale: supraspinaleMm,
      abdominal: abdominalMm,
    );

    final fatPercentage = calculateBodyFatPercentage(
      sum6: sum6,
      sum4: sum4,
      isMale: isMale,
      age: age,
      formula: formula,
    );

    final fatKg = (weightKg * fatPercentage) / 100.0;

    final muscleKg = calculateMuscleMassKg(
      heightCm: heightCm,
      weightKg: weightKg,
      age: age,
      isMale: isMale,
      armGirthCm: armFlexedGirthCm > 0 ? armFlexedGirthCm : armRelaxedGirthCm,
      tricepsMm: tricepsMm,
      thighGirthCm: thighGirthCm,
      thighMm: thighMm,
      calfGirthCm: calfGirthCm,
      calfMm: calfMm,
    );

    final musclePercentage = weightKg > 0 ? (muscleKg / weightKg) * 100.0 : 0.0;

    // Estimación ósea Rocha (1975): Bone Mass (kg) = 3.02 * (Height_m^2 * Wrist_m * Femur_m * 400)^0.712
    final heightM = heightCm / 100.0;
    final wristM = wristDiameterCm / 100.0;
    final femurM = femurDiameterCm / 100.0;
    double boneKg = 0.0;
    if (heightM > 0 && wristM > 0 && femurM > 0) {
      boneKg = 3.02 * math.pow(math.pow(heightM, 2) * wristM * femurM * 400, 0.712);
    }

    final residualKg = (weightKg - fatKg - muscleKg - boneKg).clamp(0.0, weightKg);

    final somatotype = calculateSomatotype(
      heightCm: heightCm,
      weightKg: weightKg,
      tricepsMm: tricepsMm,
      subscapularMm: subscapularMm,
      supraspinaleMm: supraspinaleMm,
      armFlexedGirthCm: armFlexedGirthCm > 0 ? armFlexedGirthCm : armRelaxedGirthCm,
      calfGirthCm: calfGirthCm,
      humerusDiameterCm: humerusDiameterCm,
      femurDiameterCm: femurDiameterCm,
      calfMm: calfMm,
    );

    return IsakResult(
      sum6: sum6,
      fatPercentage: double.parse(fatPercentage.toStringAsFixed(1)),
      fatKg: double.parse(fatKg.toStringAsFixed(1)),
      musclePercentage: double.parse(musclePercentage.toStringAsFixed(1)),
      muscleKg: double.parse(muscleKg.toStringAsFixed(1)),
      boneKg: double.parse(boneKg.toStringAsFixed(1)),
      residualKg: double.parse(residualKg.toStringAsFixed(1)),
      endomorphy: double.parse((somatotype['endo'] as double).toStringAsFixed(1)),
      mesomorphy: double.parse((somatotype['meso'] as double).toStringAsFixed(1)),
      ectomorphy: double.parse((somatotype['ecto'] as double).toStringAsFixed(1)),
      x: double.parse((somatotype['x'] as double).toStringAsFixed(2)),
      y: double.parse((somatotype['y'] as double).toStringAsFixed(2)),
      somatotypeCategory: somatotype['category'] as String,
    );
  }
}
