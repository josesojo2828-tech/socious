import 'portion_distribution_model.dart';

class MealItemModel {
  final String id;
  final String foodName;
  final String category;
  final double quantity; // ej. 1.0, 1.5, 2.0 porciones
  final String portionUnit; // ej. "1 taza (200ml)", "150g", "1 unidad"
  final double kcal;
  final double protein;
  final double fat;
  final double carbs;
  final String? notes;

  const MealItemModel({
    required this.id,
    required this.foodName,
    required this.category,
    required this.quantity,
    required this.portionUnit,
    required this.kcal,
    required this.protein,
    required this.fat,
    required this.carbs,
    this.notes,
  });

  factory MealItemModel.fromJson(Map<String, dynamic> json) {
    return MealItemModel(
      id: json['id']?.toString() ?? '',
      foodName: json['foodName']?.toString() ?? json['food_name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
      portionUnit: json['portionUnit']?.toString() ?? json['portion_unit']?.toString() ?? 'porción',
      kcal: (json['kcal'] as num?)?.toDouble() ?? 0.0,
      protein: (json['protein'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
      carbs: (json['carbs'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'foodName': foodName,
      'category': category,
      'quantity': quantity,
      'portionUnit': portionUnit,
      'kcal': kcal,
      'protein': protein,
      'fat': fat,
      'carbs': carbs,
      'notes': notes,
    };
  }
}

class MealTimeModel {
  final String id;
  final String name; // 'Desayuno', 'Media Mañana', 'Almuerzo', 'Merienda', 'Cena'
  final String suggestedTime; // '08:30', '13:00', etc.
  final List<MealItemModel> items;

  const MealTimeModel({
    required this.id,
    required this.name,
    required this.suggestedTime,
    required this.items,
  });

  double get totalKcal => items.fold(0.0, (sum, item) => sum + (item.kcal * item.quantity));
  double get totalProtein => items.fold(0.0, (sum, item) => sum + (item.protein * item.quantity));
  double get totalFat => items.fold(0.0, (sum, item) => sum + (item.fat * item.quantity));
  double get totalCarbs => items.fold(0.0, (sum, item) => sum + (item.carbs * item.quantity));

  factory MealTimeModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    return MealTimeModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Comida',
      suggestedTime: json['suggestedTime']?.toString() ?? json['suggested_time']?.toString() ?? '00:00',
      items: rawItems.map((e) => MealItemModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'suggestedTime': suggestedTime,
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class DayPlanModel {
  final String dayName; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  final List<MealTimeModel> mealTimes;

  const DayPlanModel({
    required this.dayName,
    required this.mealTimes,
  });

  double get totalKcal => mealTimes.fold(0.0, (sum, mt) => sum + mt.totalKcal);
  double get totalProtein => mealTimes.fold(0.0, (sum, mt) => sum + mt.totalProtein);
  double get totalFat => mealTimes.fold(0.0, (sum, mt) => sum + mt.totalFat);
  double get totalCarbs => mealTimes.fold(0.0, (sum, mt) => sum + mt.totalCarbs);

  factory DayPlanModel.fromJson(Map<String, dynamic> json) {
    final rawMeals = json['mealTimes'] as List? ?? json['meal_times'] as List? ?? [];
    return DayPlanModel(
      dayName: json['dayName']?.toString() ?? json['day_name']?.toString() ?? 'Lunes',
      mealTimes: rawMeals.map((e) => MealTimeModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dayName': dayName,
      'mealTimes': mealTimes.map((e) => e.toJson()).toList(),
    };
  }
}

class NutritionalPlanModel {
  final String id;
  final String patientId;
  final String title;
  final DateTime createdAt;
  final bool isActive;
  final double targetKcal;
  final double targetProtein;
  final double targetFat;
  final double targetCarbs;
  final String? nutritionistNotes;
  final List<DayPlanModel> days;
  final PortionDistributionModel? portionDistribution;

  const NutritionalPlanModel({
    required this.id,
    required this.patientId,
    required this.title,
    required this.createdAt,
    this.isActive = true,
    required this.targetKcal,
    required this.targetProtein,
    required this.targetFat,
    required this.targetCarbs,
    this.nutritionistNotes,
    required this.days,
    this.portionDistribution,
  });

  DayPlanModel? getDay(String dayName) {
    return days.firstWhere(
      (d) => d.dayName.toLowerCase() == dayName.toLowerCase(),
      orElse: () => days.isNotEmpty ? days.first : const DayPlanModel(dayName: 'Lunes', mealTimes: []),
    );
  }

  factory NutritionalPlanModel.fromJson(Map<String, dynamic> json) {
    final rawDays = json['days'] as List? ?? [];
    return NutritionalPlanModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? json['patient_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Plan Nutricional',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'].toString()) : DateTime.now(),
      isActive: json['isActive'] as bool? ?? true,
      targetKcal: (json['targetKcal'] as num?)?.toDouble() ?? 2000.0,
      targetProtein: (json['targetProtein'] as num?)?.toDouble() ?? 140.0,
      targetFat: (json['targetFat'] as num?)?.toDouble() ?? 60.0,
      targetCarbs: (json['targetCarbs'] as num?)?.toDouble() ?? 220.0,
      nutritionistNotes: json['nutritionistNotes']?.toString() ?? json['notes']?.toString(),
      days: rawDays.map((e) => DayPlanModel.fromJson(e as Map<String, dynamic>)).toList(),
      portionDistribution: json['portionDistribution'] != null
          ? PortionDistributionModel.fromJson(json['portionDistribution'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'title': title,
      'createdAt': createdAt.toIso8601String(),
      'isActive': isActive,
      'targetKcal': targetKcal,
      'targetProtein': targetProtein,
      'targetFat': targetFat,
      'targetCarbs': targetCarbs,
      'nutritionistNotes': nutritionistNotes,
      'days': days.map((e) => e.toJson()).toList(),
      'portionDistribution': portionDistribution?.toJson(),
    };
  }
}
