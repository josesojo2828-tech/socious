class FoodItemModel {
  final String id;
  final String name;
  final String category;
  final String portionReference;
  final double kcal;
  final double protein;
  final double fat;
  final double carbs;
  final double fiber;
  final double sodium;

  const FoodItemModel({
    required this.id,
    required this.name,
    required this.category,
    required this.portionReference,
    required this.kcal,
    required this.protein,
    required this.fat,
    required this.carbs,
    this.fiber = 0.0,
    this.sodium = 0.0,
  });

  factory FoodItemModel.fromJson(Map<String, dynamic> json) {
    return FoodItemModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Otros',
      portionReference: json['portionReference']?.toString() ?? json['portion_reference']?.toString() ?? '100g',
      kcal: (json['kcal'] as num?)?.toDouble() ?? 0.0,
      protein: (json['protein'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
      carbs: (json['carbs'] as num?)?.toDouble() ?? 0.0,
      fiber: (json['fiber'] as num?)?.toDouble() ?? 0.0,
      sodium: (json['sodium'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'portionReference': portionReference,
      'kcal': kcal,
      'protein': protein,
      'fat': fat,
      'carbs': carbs,
      'fiber': fiber,
      'sodium': sodium,
    };
  }

  FoodItemModel copyWith({
    String? id,
    String? name,
    String? category,
    String? portionReference,
    double? kcal,
    double? protein,
    double? fat,
    double? carbs,
    double? fiber,
    double? sodium,
  }) {
    return FoodItemModel(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      portionReference: portionReference ?? this.portionReference,
      kcal: kcal ?? this.kcal,
      protein: protein ?? this.protein,
      fat: fat ?? this.fat,
      carbs: carbs ?? this.carbs,
      fiber: fiber ?? this.fiber,
      sodium: sodium ?? this.sodium,
    );
  }
}
