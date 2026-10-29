class PortionGroupConfig {
  final String groupKey;
  final String label;
  final String referenceUnit;
  final double kcalPerPortion;
  final double proteinPerPortion;
  final double fatPerPortion;
  final double carbsPerPortion;

  const PortionGroupConfig({
    required this.groupKey,
    required this.label,
    required this.referenceUnit,
    required this.kcalPerPortion,
    required this.proteinPerPortion,
    required this.fatPerPortion,
    required this.carbsPerPortion,
  });
}

class PortionDistributionModel {
  final String id;
  final String patientId;
  final Map<String, int> portions; // ej: {'lacteos': 2, 'carnes': 4, 'verduras': 3, 'frutas': 3, 'cereales': 5, 'grasas': 3}

  const PortionDistributionModel({
    required this.id,
    required this.patientId,
    required this.portions,
  });

  static const Map<String, PortionGroupConfig> groupConfigs = {
    'lacteos': PortionGroupConfig(
      groupKey: 'lacteos',
      label: 'Lácteos',
      referenceUnit: '1 taza (200ml) de leche o 1 vaso de yogur',
      kcalPerPortion: 110,
      proteinPerPortion: 9,
      fatPerPortion: 3,
      carbsPerPortion: 12,
    ),
    'carnes': PortionGroupConfig(
      groupKey: 'carnes',
      label: 'Carnes y Huevos',
      referenceUnit: '100g de carne magra o 2 huevos',
      kcalPerPortion: 150,
      proteinPerPortion: 20,
      fatPerPortion: 8,
      carbsPerPortion: 0,
    ),
    'verduras': PortionGroupConfig(
      groupKey: 'verduras',
      label: 'Verduras',
      referenceUnit: '1 plato de ensalada verde o 1 taza de cocidas',
      kcalPerPortion: 30,
      proteinPerPortion: 2,
      fatPerPortion: 0,
      carbsPerPortion: 5,
    ),
    'frutas': PortionGroupConfig(
      groupKey: 'frutas',
      label: 'Frutas',
      referenceUnit: '1 unidad mediana (manzana/banana) o 1 taza de picada',
      kcalPerPortion: 60,
      proteinPerPortion: 0,
      fatPerPortion: 0,
      carbsPerPortion: 15,
    ),
    'cereales': PortionGroupConfig(
      groupKey: 'cereales',
      label: 'Cereales y Tubérculos',
      referenceUnit: '1/2 taza de arroz/avena o 1 papa mediana',
      kcalPerPortion: 100,
      proteinPerPortion: 2,
      fatPerPortion: 1,
      carbsPerPortion: 20,
    ),
    'grasas': PortionGroupConfig(
      groupKey: 'grasas',
      label: 'Grasas y Aceites',
      referenceUnit: '1 cdita de aceite de oliva o 30g de palta/frutos secos',
      kcalPerPortion: 45,
      proteinPerPortion: 0,
      fatPerPortion: 5,
      carbsPerPortion: 0,
    ),
  };

  int getPortionsCount(String groupKey) => portions[groupKey] ?? 0;

  double get totalKcal {
    double total = 0;
    portions.forEach((key, count) {
      final config = groupConfigs[key];
      if (config != null) {
        total += config.kcalPerPortion * count;
      }
    });
    return total;
  }

  double get totalProtein {
    double total = 0;
    portions.forEach((key, count) {
      final config = groupConfigs[key];
      if (config != null) {
        total += config.proteinPerPortion * count;
      }
    });
    return total;
  }

  double get totalFat {
    double total = 0;
    portions.forEach((key, count) {
      final config = groupConfigs[key];
      if (config != null) {
        total += config.fatPerPortion * count;
      }
    });
    return total;
  }

  double get totalCarbs {
    double total = 0;
    portions.forEach((key, count) {
      final config = groupConfigs[key];
      if (config != null) {
        total += config.carbsPerPortion * count;
      }
    });
    return total;
  }

  factory PortionDistributionModel.fromJson(Map<String, dynamic> json) {
    final rawPortions = json['portions'];
    Map<String, int> parsedPortions = {};
    if (rawPortions is Map) {
      rawPortions.forEach((key, value) {
        parsedPortions[key.toString()] = (value as num?)?.toInt() ?? 0;
      });
    }
    return PortionDistributionModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? json['patient_id']?.toString() ?? '',
      portions: parsedPortions,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'portions': portions,
      'totalKcal': totalKcal,
      'totalProtein': totalProtein,
      'totalFat': totalFat,
      'totalCarbs': totalCarbs,
    };
  }

  PortionDistributionModel copyWith({
    String? id,
    String? patientId,
    Map<String, int>? portions,
  }) {
    return PortionDistributionModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      portions: portions ?? Map.from(this.portions),
    );
  }
}
