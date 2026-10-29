import 'dart:math' as math;

/// Modelo de Fórmulas Lácteas Prescritas (InfantFormulaHistory en NestJS / Prisma)
class InfantFormulaModel {
  final String id;
  final String? pediatricHistoryId;
  final double? capacityMl;
  final double? dailyVolumeMl;
  final double? densityKcalPerMl;
  final int? feedingFrequency;
  final String? formulaType;
  final DateTime? date;
  final DateTime? createdAt;

  const InfantFormulaModel({
    required this.id,
    this.pediatricHistoryId,
    this.capacityMl,
    this.dailyVolumeMl,
    this.densityKcalPerMl,
    this.feedingFrequency,
    this.formulaType,
    this.date,
    this.createdAt,
  });

  factory InfantFormulaModel.fromJson(Map<String, dynamic> json) {
    return InfantFormulaModel(
      id: json['id'] as String? ?? '',
      pediatricHistoryId: json['pediatricHistoryId'] as String?,
      capacityMl: _parseDouble(json['capacityMl']),
      dailyVolumeMl: _parseDouble(json['dailyVolumeMl']),
      densityKcalPerMl: _parseDouble(json['densityKcalPerMl']),
      feedingFrequency: _parseInt(json['feedingFrequency']),
      formulaType: json['formulaType'] as String?,
      date: json['date'] != null ? DateTime.tryParse(json['date'].toString()) : null,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pediatricHistoryId': pediatricHistoryId,
      'capacityMl': capacityMl,
      'dailyVolumeMl': dailyVolumeMl,
      'densityKcalPerMl': densityKcalPerMl,
      'feedingFrequency': feedingFrequency,
      'formulaType': formulaType,
      'date': date?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

/// Resultado de Clasificación Z-Score OMS / CDC
class WhoIndicatorResult {
  final String code; // P/E, T/E, P/T, IMC/E
  final String name; // Nombre descriptivo
  final double? measuredValue;
  final String unit;
  final double? zScore;
  final String classification;
  final String zoneLabel;
  final String severity; // NORMAL, WARNING, CRITICAL
  final String clinicalNote;

  const WhoIndicatorResult({
    required this.code,
    required this.name,
    this.measuredValue,
    required this.unit,
    this.zScore,
    required this.classification,
    required this.zoneLabel,
    required this.severity,
    required this.clinicalNote,
  });
}

/// Modelo de Historia Clínica Pediátrica (PediatricHistory en NestJS / Prisma)
class PediatricHistoryModel {
  final String id;
  final String patientId;

  // 1. Antropometría Pediátrica
  final double? weightKg;
  final double? heightCm;
  final double? sittingHeightCm;
  final double? headCircumferenceCm;
  final double? midUpperArmCircumferenceCm;
  final double? tricepsSkinfoldMm;
  final double? subscapularSkinfoldMm;
  final double? activityFactor;
  final double? growthCost;
  final double? schofieldTmb;
  final double? harrisBenedictWoman;
  final double? rct;
  final double? mirwaldPhv;
  final String? growthClassification;
  final String? growthChartType;

  // 2. Representante y Entorno
  final String? representativeName;
  final String? representativePhone;
  final String? representativeEmail;
  final String? representativeRelationship;
  final String? cohabitants;

  // 3. Perinatales y Desarrollo
  final double? gestationalAgeWeeks;
  final double? birthWeightKg;
  final double? birthLengthCm;
  final double? birthHeadCircumferenceCm;
  final String? apgarScore;
  final String? birthComplications;
  final String? developmentalMilestones;

  // 4. Alimentación y Lactancia
  final double? breastfeedingDurationMonths;
  final String? breastfeedingType;
  final double? complementaryFeedingStartMonths;
  final String? allergenIntroductionDetails;
  final String? foodPreferences;
  final String? foodRejections;

  // 5. Conducta y Estilo de Vida
  final bool? eatsWithFamily;
  final bool? eatsWithScreens;
  final double? mealDurationMinutes;
  final double? sleepHours;
  final double? screenTimeHoursPerDay;
  final String? structuredPhysicalActivity;

  // 6. Síntomas Gastrointestinales & NFPE
  final List<String> giSymptoms;
  final int? bristolStoolType;
  final String? bowelFrequency;
  final String? clinicalFindings;

  // 7. Diagnóstico PES & Riesgo
  final String? pesDiagnosis;
  final String? nutritionalRiskLevel;
  final String? interventionPriorities;

  // 8. Fórmulas Lácteas Prescritas
  final List<InfantFormulaModel> infantFormulas;

  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PediatricHistoryModel({
    required this.id,
    required this.patientId,
    this.weightKg,
    this.heightCm,
    this.sittingHeightCm,
    this.headCircumferenceCm,
    this.midUpperArmCircumferenceCm,
    this.tricepsSkinfoldMm,
    this.subscapularSkinfoldMm,
    this.activityFactor,
    this.growthCost,
    this.schofieldTmb,
    this.harrisBenedictWoman,
    this.rct,
    this.mirwaldPhv,
    this.growthClassification,
    this.growthChartType,
    this.representativeName,
    this.representativePhone,
    this.representativeEmail,
    this.representativeRelationship,
    this.cohabitants,
    this.gestationalAgeWeeks,
    this.birthWeightKg,
    this.birthLengthCm,
    this.birthHeadCircumferenceCm,
    this.apgarScore,
    this.birthComplications,
    this.developmentalMilestones,
    this.breastfeedingDurationMonths,
    this.breastfeedingType,
    this.complementaryFeedingStartMonths,
    this.allergenIntroductionDetails,
    this.foodPreferences,
    this.foodRejections,
    this.eatsWithFamily,
    this.eatsWithScreens,
    this.mealDurationMinutes,
    this.sleepHours,
    this.screenTimeHoursPerDay,
    this.structuredPhysicalActivity,
    this.giSymptoms = const [],
    this.bristolStoolType,
    this.bowelFrequency,
    this.clinicalFindings,
    this.pesDiagnosis,
    this.nutritionalRiskLevel,
    this.interventionPriorities,
    this.infantFormulas = const [],
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  /// Índice de Masa Corporal (IMC) Pediátrico
  double? get bmi {
    if (weightKg == null || heightCm == null || heightCm! <= 0) return null;
    final h = heightCm! / 100.0;
    return double.parse((weightKg! / (h * h)).toStringAsFixed(2));
  }

  /// Capacidad Gástrica Funcional (EVANUTDEP: Peso × 30 ml)
  double get gastricCapacityMl => (weightKg ?? 0) * 30.0;
  double get gastricCapacityOz => gastricCapacityMl / 30.0;

  /// Volumen Diario Total de Fórmula (EVANUTDEP: Peso × 150 ml/kg)
  double get dailyFormulaVolumeMl => (weightKg ?? 0) * 150.0;

  /// Tomas recomendadas al día
  double get recommendedDosesPerDay {
    final cap = gastricCapacityMl;
    if (cap <= 0) return 0;
    return dailyFormulaVolumeMl / cap;
  }

  /// Enlace directo para abrir chat de WhatsApp con el representante
  String? get representativeWhatsappUrl {
    if (representativePhone == null || representativePhone!.trim().isEmpty) return null;
    final cleanPhone = representativePhone!.replaceAll(RegExp(r'[^\d+]'), '');
    if (cleanPhone.isEmpty) return null;
    return 'https://wa.me/$cleanPhone';
  }

  /// Evaluación clínica de los 4 indicadores Z-Score OMS / CDC (P/E, T/E, P/T, IMC/E)
  List<WhoIndicatorResult> evaluateWhoZScores({
    required double ageYears,
    required double ageMonths,
    required bool isFemale,
  }) {
    final List<WhoIndicatorResult> results = [];
    final currentWeight = weightKg;
    final currentHeight = heightCm;
    final currentBmi = bmi;

    // 1. P/E — Peso para la Edad (Weight-for-Age)
    if (ageYears > 10) {
      results.add(
        WhoIndicatorResult(
          code: 'P/E',
          name: 'Peso para la Edad',
          measuredValue: currentWeight,
          unit: 'kg',
          zScore: null,
          classification: 'No aplica (> 10 años)',
          zoneLabel: 'Evaluación por IMC/E',
          severity: 'NORMAL',
          clinicalNote: 'En mayores de 10 años la OMS recomienda priorizar el indicador IMC para la Edad (IMC/E).',
        ),
      );
    } else if (currentWeight == null) {
      results.add(
        const WhoIndicatorResult(
          code: 'P/E',
          name: 'Peso para la Edad',
          measuredValue: null,
          unit: 'kg',
          zScore: null,
          classification: 'Dato no disponible',
          zoneLabel: 'Sin registro',
          severity: 'NORMAL',
          clinicalNote: 'Se requiere registrar el peso actual del paciente.',
        ),
      );
    } else {
      final double medianWeight;
      if (ageMonths <= 12) {
        medianWeight = isFemale ? (3.2 + ageMonths * 0.55) : (3.3 + ageMonths * 0.58);
      } else if (ageYears <= 5) {
        medianWeight = isFemale ? (1.9 * ageYears + 8.2) : (2.0 * ageYears + 8.5);
      } else {
        medianWeight = 3.0 * ageYears + 3.0;
      }
      final sd = medianWeight * 0.13;
      final z = double.parse(((currentWeight - medianWeight) / sd).toStringAsFixed(2));

      String classification;
      String zoneLabel;
      String severity;
      String note;

      if (z < -3.0) {
        classification = 'Déficit Severo';
        zoneLabel = 'Zona 1 (<-3 DE)';
        severity = 'CRITICAL';
        note = 'Desnutrición global severa según estándares OMS/INN-SISVAN.';
      } else if (z < -2.0) {
        classification = 'Déficit Moderado (Bajo Peso)';
        zoneLabel = 'Zona 2 (-3 a -2 DE)';
        severity = 'WARNING';
        note = 'Peso bajo para la edad cronológica. Requiere intervención calórico-proteica.';
      } else if (z <= 2.0) {
        classification = 'Adecuado / Eutrófico';
        zoneLabel = 'Zona 3 (-2 a +2 DE)';
        severity = 'NORMAL';
        note = 'Crecimiento ponderal acorde al estándar de referencia internacional.';
      } else {
        classification = 'Peso Elevado';
        zoneLabel = 'Zona 4/5 (>+2 DE)';
        severity = 'WARNING';
        note = 'Peso alto para la edad. Evaluar composición corporal y relación con la talla.';
      }

      results.add(
        WhoIndicatorResult(
          code: 'P/E',
          name: 'Peso para la Edad',
          measuredValue: currentWeight,
          unit: 'kg',
          zScore: z,
          classification: classification,
          zoneLabel: zoneLabel,
          severity: severity,
          clinicalNote: note,
        ),
      );
    }

    // 2. T/E — Talla para la Edad (Length/Height-for-Age)
    if (currentHeight == null) {
      results.add(
        const WhoIndicatorResult(
          code: 'T/E',
          name: 'Talla para la Edad',
          measuredValue: null,
          unit: 'cm',
          zScore: null,
          classification: 'Dato no disponible',
          zoneLabel: 'Sin registro',
          severity: 'NORMAL',
          clinicalNote: 'Se requiere registrar la talla o longitud actual del paciente.',
        ),
      );
    } else {
      final double medianHeight;
      if (ageMonths <= 12) {
        medianHeight = isFemale ? (49.2 + ageMonths * 1.95) : (50.0 + ageMonths * 2.0);
      } else if (ageYears <= 5) {
        medianHeight = isFemale ? (ageYears * 6.5 + 76.0) : (ageYears * 6.6 + 77.0);
      } else if (ageYears <= 12) {
        medianHeight = ageYears * 5.4 + 83.0;
      } else {
        medianHeight = isFemale ? (138.0 + (ageYears - 10) * 3.8) : (138.0 + (ageYears - 10) * 5.5);
      }
      final sd = medianHeight * 0.045;
      final z = double.parse(((currentHeight - medianHeight) / sd).toStringAsFixed(2));

      String classification;
      String zoneLabel;
      String severity;
      String note;

      if (z < -3.0) {
        classification = 'Talla Baja Severa';
        zoneLabel = 'Zona 1 (<-3 DE)';
        severity = 'CRITICAL';
        note = 'Retardo severo en el crecimiento lineal (desnutrición crónica severa).';
      } else if (z < -2.0) {
        classification = 'Talla Baja';
        zoneLabel = 'Zona 2 (-3 a -2 DE)';
        severity = 'WARNING';
        note = 'Retardo en la velocidad de crecimiento estatural.';
      } else if (z <= 2.0) {
        classification = 'Talla Adecuada';
        zoneLabel = 'Zona 3 (-2 a +2 DE)';
        severity = 'NORMAL';
        note = 'Longitud/talla normal para la edad cronológica.';
      } else {
        classification = 'Talla Alta';
        zoneLabel = 'Zona 4/5 (>+2 DE)';
        severity = 'NORMAL';
        note = 'Crecimiento longitudinal por encima del promedio.';
      }

      results.add(
        WhoIndicatorResult(
          code: 'T/E',
          name: 'Talla para la Edad',
          measuredValue: currentHeight,
          unit: 'cm',
          zScore: z,
          classification: classification,
          zoneLabel: zoneLabel,
          severity: severity,
          clinicalNote: note,
        ),
      );
    }

    // 3. P/T — Peso para la Talla (Weight-for-Length/Height)
    if (currentWeight == null || currentHeight == null) {
      results.add(
        const WhoIndicatorResult(
          code: 'P/T',
          name: 'Peso para la Talla',
          measuredValue: null,
          unit: 'kg',
          zScore: null,
          classification: 'Dato no disponible',
          zoneLabel: 'Sin registro',
          severity: 'NORMAL',
          clinicalNote: 'Se requiere peso y talla para evaluar la armonía pondoestatural.',
        ),
      );
    } else if (ageYears > 5 || currentHeight > 125) {
      results.add(
        WhoIndicatorResult(
          code: 'P/T',
          name: 'Peso para la Talla',
          measuredValue: currentWeight,
          unit: 'kg',
          zScore: null,
          classification: 'Reemplazado por IMC/E',
          zoneLabel: 'Escolar / Adolescente',
          severity: 'NORMAL',
          clinicalNote: 'En >5 años o talla >125 cm, la OMS estandariza la evaluación de emaciación/sobrepeso con IMC/E.',
        ),
      );
    } else {
      // Curva ponderal OMS 45 a 125 cm
      final medianWeightForHeight =
          0.00078 * (currentHeight * currentHeight) + 0.03 * currentHeight - 1.2;
      final sd = math.max(0.6, medianWeightForHeight * 0.11);
      final z = double.parse(((currentWeight - medianWeightForHeight) / sd).toStringAsFixed(2));

      String classification;
      String zoneLabel;
      String severity;
      String note;

      if (z < -3.0) {
        classification = 'Emaciación Severa';
        zoneLabel = 'Zona 1 (<-3 DE)';
        severity = 'CRITICAL';
        note = 'Desnutrición aguda severa. Requiere intervención clínica inmediata.';
      } else if (z < -2.0) {
        classification = 'Emaciación Moderada';
        zoneLabel = 'Zona 2 (-3 a -2 DE)';
        severity = 'WARNING';
        note = 'Desnutrición aguda moderada. Déficit ponderal respecto a la talla.';
      } else if (z <= 1.0) {
        classification = 'Adecuado / Normal';
        zoneLabel = 'Zona 3 (-2 a +1 DE)';
        severity = 'NORMAL';
        note = 'Peso armónico y proporcional a la longitud/talla.';
      } else if (z <= 2.0) {
        classification = 'Riesgo de Sobrepeso';
        zoneLabel = 'Zona 4 (+1 a +2 DE)';
        severity = 'WARNING';
        note = 'Tendencia a exceso ponderal relativo a la talla.';
      } else if (z <= 3.0) {
        classification = 'Sobrepeso';
        zoneLabel = 'Zona 4 (+2 a +3 DE)';
        severity = 'WARNING';
        note = 'Sobrepeso infantil. Orientar hábitos de alimentación familiar.';
      } else {
        classification = 'Obesidad';
        zoneLabel = 'Zona 5 (>+3 DE)';
        severity = 'CRITICAL';
        note = 'Obesidad severa en el paciente pediátrico.';
      }

      results.add(
        WhoIndicatorResult(
          code: 'P/T',
          name: 'Peso para la Talla',
          measuredValue: currentWeight,
          unit: 'kg',
          zScore: z,
          classification: classification,
          zoneLabel: zoneLabel,
          severity: severity,
          clinicalNote: note,
        ),
      );
    }

    // 4. IMC/E — IMC para la Edad (BMI-for-Age)
    if (currentBmi == null) {
      results.add(
        const WhoIndicatorResult(
          code: 'IMC/E',
          name: 'IMC para la Edad',
          measuredValue: null,
          unit: 'kg/m²',
          zScore: null,
          classification: 'Dato no disponible',
          zoneLabel: 'Sin registro',
          severity: 'NORMAL',
          clinicalNote: 'Se requiere peso y talla para el cálculo del IMC.',
        ),
      );
    } else {
      final double medianBmi;
      if (ageYears < 2) {
        medianBmi = 16.8;
      } else if (ageYears <= 5) {
        medianBmi = 15.8 - (ageYears - 2) * 0.15;
      } else if (ageYears <= 10) {
        medianBmi = 15.3 + (ageYears - 5) * 0.25;
      } else if (ageYears <= 15) {
        medianBmi = 16.5 + (ageYears - 10) * 0.65;
      } else {
        medianBmi = 19.7 + (ageYears - 15) * 0.60;
      }
      final sd = medianBmi * 0.11;
      final z = double.parse(((currentBmi - medianBmi) / sd).toStringAsFixed(2));

      String classification;
      String zoneLabel;
      String severity;
      String note;

      if (z < -3.0) {
        classification = 'Delgadez Severa';
        zoneLabel = 'Zona 1 (<-3 DE)';
        severity = 'CRITICAL';
        note = 'Déficit calórico-proteico crítico según IMC para la edad.';
      } else if (z < -2.0) {
        classification = 'Delgadez';
        zoneLabel = 'Zona 2 (-3 a -2 DE)';
        severity = 'WARNING';
        note = 'Bajo peso para la edad y estatura.';
      } else if (z <= 1.0) {
        classification = 'Eutrófico / Normal';
        zoneLabel = 'Zona 3 (-2 a +1 DE)';
        severity = 'NORMAL';
        note = 'Índice de masa corporal adecuado para la edad.';
      } else if (z <= 2.0) {
        classification = 'Sobrepeso';
        zoneLabel = 'Zona 4 (+1 a +2 DE)';
        severity = 'WARNING';
        note = 'Sobrepeso según curvas de percentil OMS.';
      } else {
        classification = 'Obesidad Pediátrica';
        zoneLabel = 'Zona 5 (>+2 DE)';
        severity = 'CRITICAL';
        note = 'Obesidad pediátrica. Fomentar plan nutricional y actividad física activa.';
      }

      results.add(
        WhoIndicatorResult(
          code: 'IMC/E',
          name: 'IMC para la Edad',
          measuredValue: currentBmi,
          unit: 'kg/m²',
          zScore: z,
          classification: classification,
          zoneLabel: zoneLabel,
          severity: severity,
          clinicalNote: note,
        ),
      );
    }

    return results;
  }

  factory PediatricHistoryModel.fromJson(Map<String, dynamic> json) {
    List<String> parseStringList(dynamic val) {
      if (val is List) {
        return val.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
      }
      return const [];
    }

    List<InfantFormulaModel> parseFormulas(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map<String, dynamic>>()
            .map((e) => InfantFormulaModel.fromJson(e))
            .toList();
      }
      return const [];
    }

    return PediatricHistoryModel(
      id: json['id'] as String? ?? '',
      patientId: json['patientId'] as String? ?? '',
      weightKg: _parseDouble(json['weightKg']),
      heightCm: _parseDouble(json['heightCm']),
      sittingHeightCm: _parseDouble(json['sittingHeightCm']),
      headCircumferenceCm: _parseDouble(json['headCircumferenceCm']),
      midUpperArmCircumferenceCm: _parseDouble(json['midUpperArmCircumferenceCm']),
      tricepsSkinfoldMm: _parseDouble(json['tricepsSkinfoldMm']),
      subscapularSkinfoldMm: _parseDouble(json['subscapularSkinfoldMm']),
      activityFactor: _parseDouble(json['activityFactor']),
      growthCost: _parseDouble(json['growthCost']),
      schofieldTmb: _parseDouble(json['schofieldTmb']),
      harrisBenedictWoman: _parseDouble(json['harrisBenedictWoman']),
      rct: _parseDouble(json['rct']),
      mirwaldPhv: _parseDouble(json['mirwaldPhv']),
      growthClassification: json['growthClassification'] as String?,
      growthChartType: json['growthChartType'] as String?,
      representativeName: json['representativeName'] as String?,
      representativePhone: json['representativePhone'] as String?,
      representativeEmail: json['representativeEmail'] as String?,
      representativeRelationship: json['representativeRelationship'] as String?,
      cohabitants: json['cohabitants'] as String?,
      gestationalAgeWeeks: _parseDouble(json['gestationalAgeWeeks']),
      birthWeightKg: _parseDouble(json['birthWeightKg']),
      birthLengthCm: _parseDouble(json['birthLengthCm']),
      birthHeadCircumferenceCm: _parseDouble(json['birthHeadCircumferenceCm']),
      apgarScore: json['apgarScore'] as String?,
      birthComplications: json['birthComplications'] as String?,
      developmentalMilestones: json['developmentalMilestones'] as String?,
      breastfeedingDurationMonths: _parseDouble(json['breastfeedingDurationMonths']),
      breastfeedingType: json['breastfeedingType'] as String?,
      complementaryFeedingStartMonths: _parseDouble(json['complementaryFeedingStartMonths']),
      allergenIntroductionDetails: json['allergenIntroductionDetails'] as String?,
      foodPreferences: json['foodPreferences'] as String?,
      foodRejections: json['foodRejections'] as String?,
      eatsWithFamily: _parseBool(json['eatsWithFamily']),
      eatsWithScreens: _parseBool(json['eatsWithScreens']),
      mealDurationMinutes: _parseDouble(json['mealDurationMinutes']),
      sleepHours: _parseDouble(json['sleepHours']),
      screenTimeHoursPerDay: _parseDouble(json['screenTimeHoursPerDay']),
      structuredPhysicalActivity: json['structuredPhysicalActivity'] as String?,
      giSymptoms: parseStringList(json['giSymptoms']),
      bristolStoolType: _parseInt(json['bristolStoolType']),
      bowelFrequency: json['bowelFrequency'] as String?,
      clinicalFindings: json['clinicalFindings'] as String?,
      pesDiagnosis: json['pesDiagnosis'] as String?,
      nutritionalRiskLevel: json['nutritionalRiskLevel'] as String?,
      interventionPriorities: json['interventionPriorities'] as String?,
      infantFormulas: parseFormulas(json['infantFormulas']),
      isActive: _parseBool(json['isActive']) ?? true,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'weightKg': weightKg,
      'heightCm': heightCm,
      'sittingHeightCm': sittingHeightCm,
      'headCircumferenceCm': headCircumferenceCm,
      'midUpperArmCircumferenceCm': midUpperArmCircumferenceCm,
      'tricepsSkinfoldMm': tricepsSkinfoldMm,
      'subscapularSkinfoldMm': subscapularSkinfoldMm,
      'activityFactor': activityFactor,
      'growthCost': growthCost,
      'schofieldTmb': schofieldTmb,
      'harrisBenedictWoman': harrisBenedictWoman,
      'rct': rct,
      'mirwaldPhv': mirwaldPhv,
      'growthClassification': growthClassification,
      'growthChartType': growthChartType,
      'representativeName': representativeName,
      'representativePhone': representativePhone,
      'representativeEmail': representativeEmail,
      'representativeRelationship': representativeRelationship,
      'cohabitants': cohabitants,
      'gestationalAgeWeeks': gestationalAgeWeeks,
      'birthWeightKg': birthWeightKg,
      'birthLengthCm': birthLengthCm,
      'birthHeadCircumferenceCm': birthHeadCircumferenceCm,
      'apgarScore': apgarScore,
      'birthComplications': birthComplications,
      'developmentalMilestones': developmentalMilestones,
      'breastfeedingDurationMonths': breastfeedingDurationMonths,
      'breastfeedingType': breastfeedingType,
      'complementaryFeedingStartMonths': complementaryFeedingStartMonths,
      'allergenIntroductionDetails': allergenIntroductionDetails,
      'foodPreferences': foodPreferences,
      'foodRejections': foodRejections,
      'eatsWithFamily': eatsWithFamily,
      'eatsWithScreens': eatsWithScreens,
      'mealDurationMinutes': mealDurationMinutes,
      'sleepHours': sleepHours,
      'screenTimeHoursPerDay': screenTimeHoursPerDay,
      'structuredPhysicalActivity': structuredPhysicalActivity,
      'giSymptoms': giSymptoms,
      'bristolStoolType': bristolStoolType,
      'bowelFrequency': bowelFrequency,
      'clinicalFindings': clinicalFindings,
      'pesDiagnosis': pesDiagnosis,
      'nutritionalRiskLevel': nutritionalRiskLevel,
      'interventionPriorities': interventionPriorities,
      'infantFormulas': infantFormulas.map((e) => e.toJson()).toList(),
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

double? _parseDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

int? _parseInt(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

bool? _parseBool(dynamic value) {
  if (value == null) return null;
  if (value is bool) return value;
  if (value == 'true' || value == 1) return true;
  if (value == 'false' || value == 0) return false;
  return null;
}
