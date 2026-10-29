double _parseDouble(dynamic v) {
  if (v == null) return 0.0;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? 0.0;
  return 0.0;
}

int _parseInt(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}

class MenuItemModel {
  final String id;
  final String menuId;
  final String foodId;
  final double quantity;
  final String? unit;
  final String? portionLabel;
  final String foodName;
  final double foodCalories;
  final double foodProteins;
  final double foodCarbs;
  final double foodFats;

  const MenuItemModel({
    required this.id,
    required this.menuId,
    required this.foodId,
    required this.quantity,
    this.unit,
    this.portionLabel,
    required this.foodName,
    required this.foodCalories,
    required this.foodProteins,
    required this.foodCarbs,
    required this.foodFats,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final food = json['food'] as Map<String, dynamic>?;
    final qty = _parseDouble(json['quantity']);
    final baseQty = food != null && food['baseQuantity'] != null
        ? _parseDouble(food['baseQuantity'])
        : 100.0;
    final ratio = baseQty > 0 ? (qty / baseQty) : 1.0;

    final rawCalories = food != null && food['calories'] != null
        ? _parseDouble(food['calories'])
        : (food != null && food['kcal'] != null
            ? _parseDouble(food['kcal'])
            : _parseDouble(json['foodCalories']));
    final rawProteins = food != null && food['proteins'] != null
        ? _parseDouble(food['proteins'])
        : (food != null && food['protein'] != null
            ? _parseDouble(food['protein'])
            : _parseDouble(json['foodProteins']));
    final rawCarbs = food != null && food['carbohydrates'] != null
        ? _parseDouble(food['carbohydrates'])
        : (food != null && food['carbs'] != null
            ? _parseDouble(food['carbs'])
            : _parseDouble(json['foodCarbs']));
    final rawFats = food != null && food['fats'] != null
        ? _parseDouble(food['fats'])
        : (food != null && food['fat'] != null
            ? _parseDouble(food['fat'])
            : _parseDouble(json['foodFats']));

    final calculatedCalories = json.containsKey('foodCalories') && food == null
        ? _parseDouble(json['foodCalories'])
        : (rawCalories * ratio);
    final calculatedProteins = json.containsKey('foodProteins') && food == null
        ? _parseDouble(json['foodProteins'])
        : (rawProteins * ratio);
    final calculatedCarbs = json.containsKey('foodCarbs') && food == null
        ? _parseDouble(json['foodCarbs'])
        : (rawCarbs * ratio);
    final calculatedFats = json.containsKey('foodFats') && food == null
        ? _parseDouble(json['foodFats'])
        : (rawFats * ratio);

    return MenuItemModel(
      id: json['id']?.toString() ?? '',
      menuId: json['menuId']?.toString() ?? '',
      foodId: json['foodId']?.toString() ?? food?['id']?.toString() ?? '',
      quantity: qty,
      unit: json['unit']?.toString(),
      portionLabel: json['portionLabel']?.toString(),
      foodName: food?['name']?.toString() ?? json['foodName']?.toString() ?? 'Alimento',
      foodCalories: calculatedCalories,
      foodProteins: calculatedProteins,
      foodCarbs: calculatedCarbs,
      foodFats: calculatedFats,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'menuId': menuId,
      'foodId': foodId,
      'quantity': quantity,
      'unit': unit,
      'portionLabel': portionLabel,
      'foodName': foodName,
      'foodCalories': foodCalories,
      'foodProteins': foodProteins,
      'foodCarbs': foodCarbs,
      'foodFats': foodFats,
    };
  }

  MenuItemModel copyWith({
    String? id,
    String? menuId,
    String? foodId,
    double? quantity,
    String? unit,
    String? portionLabel,
    String? foodName,
    double? foodCalories,
    double? foodProteins,
    double? foodCarbs,
    double? foodFats,
  }) {
    return MenuItemModel(
      id: id ?? this.id,
      menuId: menuId ?? this.menuId,
      foodId: foodId ?? this.foodId,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      portionLabel: portionLabel ?? this.portionLabel,
      foodName: foodName ?? this.foodName,
      foodCalories: foodCalories ?? this.foodCalories,
      foodProteins: foodProteins ?? this.foodProteins,
      foodCarbs: foodCarbs ?? this.foodCarbs,
      foodFats: foodFats ?? this.foodFats,
    );
  }
}

class MenuCondimentModel {
  final String id;
  final String menuId;
  final String condimentId;
  final String condimentName;
  final double? quantity;
  final String? unit;

  const MenuCondimentModel({
    required this.id,
    required this.menuId,
    required this.condimentId,
    required this.condimentName,
    this.quantity,
    this.unit,
  });

  factory MenuCondimentModel.fromJson(Map<String, dynamic> json) {
    final condiment = json['condiment'] as Map<String, dynamic>?;
    return MenuCondimentModel(
      id: json['id']?.toString() ?? '',
      menuId: json['menuId']?.toString() ?? '',
      condimentId: json['condimentId']?.toString() ?? condiment?['id']?.toString() ?? '',
      condimentName: condiment?['name']?.toString() ?? json['condimentName']?.toString() ?? 'Condimento',
      quantity: json['quantity'] != null ? _parseDouble(json['quantity']) : null,
      unit: json['unit']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'menuId': menuId,
      'condimentId': condimentId,
      'condimentName': condimentName,
      'quantity': quantity,
      'unit': unit,
    };
  }

  MenuCondimentModel copyWith({
    String? id,
    String? menuId,
    String? condimentId,
    String? condimentName,
    double? quantity,
    String? unit,
  }) {
    return MenuCondimentModel(
      id: id ?? this.id,
      menuId: menuId ?? this.menuId,
      condimentId: condimentId ?? this.condimentId,
      condimentName: condimentName ?? this.condimentName,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
    );
  }
}

class MenuDashboardMetricsModel {
  final int totalMenus;
  final int assignedPatients;
  final String topCategory;
  final double avgCalories;
  final double avgProtein;
  final double avgCarbs;
  final double avgFats;

  const MenuDashboardMetricsModel({
    required this.totalMenus,
    required this.assignedPatients,
    required this.topCategory,
    required this.avgCalories,
    required this.avgProtein,
    required this.avgCarbs,
    required this.avgFats,
  });

  factory MenuDashboardMetricsModel.fromJson(Map<String, dynamic> json) {
    final overview = json['overview'] as Map<String, dynamic>?;
    final averages = json['averages'] as Map<String, dynamic>?;

    return MenuDashboardMetricsModel(
      totalMenus: _parseInt(overview?['totalMenus'] ?? json['totalMenus']),
      assignedPatients: _parseInt(overview?['assignedPatients'] ?? json['assignedPatients']),
      topCategory: overview?['topCategory']?.toString() ?? json['topCategory']?.toString() ?? 'N/A',
      avgCalories: _parseDouble(averages?['avgCalories'] ?? json['avgCalories']),
      avgProtein: _parseDouble(averages?['avgProtein'] ?? json['avgProtein']),
      avgCarbs: _parseDouble(averages?['avgCarbs'] ?? json['avgCarbs']),
      avgFats: _parseDouble(averages?['avgFats'] ?? json['avgFats']),
    );
  }

  factory MenuDashboardMetricsModel.empty() {
    return const MenuDashboardMetricsModel(
      totalMenus: 0,
      assignedPatients: 0,
      topCategory: 'N/A',
      avgCalories: 0.0,
      avgProtein: 0.0,
      avgCarbs: 0.0,
      avgFats: 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalMenus': totalMenus,
      'assignedPatients': assignedPatients,
      'topCategory': topCategory,
      'avgCalories': avgCalories,
      'avgProtein': avgProtein,
      'avgCarbs': avgCarbs,
      'avgFats': avgFats,
    };
  }
}

class MenuModel {
  final String id;
  final String name;
  final String category;
  final String? description;
  final String? tags;
  final String? imageUrl;
  final double totalKcal;
  final double totalProtein;
  final double totalCarbs;
  final double totalFats;
  final String? createdBy;
  final int itemsCount;
  final List<MenuItemModel> items;
  final List<MenuCondimentModel> condiments;
  final DateTime? createdAt;
  final DateTime? publishedAt;
  final bool canViewCondiments;

  const MenuModel({
    required this.id,
    required this.name,
    required this.category,
    this.description,
    this.tags,
    this.imageUrl,
    required this.totalKcal,
    required this.totalProtein,
    required this.totalCarbs,
    required this.totalFats,
    this.createdBy,
    required this.itemsCount,
    this.items = const [],
    this.condiments = const [],
    this.createdAt,
    this.publishedAt,
    this.canViewCondiments = false,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    String? createdByText;
    final createdByRaw = json['createdBy'];
    if (createdByRaw is Map<String, dynamic>) {
      final first = createdByRaw['firstName']?.toString() ?? '';
      final last = createdByRaw['lastName']?.toString() ?? '';
      final fullName = '$first $last'.trim();
      createdByText = fullName.isNotEmpty
          ? fullName
          : (createdByRaw['username']?.toString() ?? createdByRaw['email']?.toString());
    } else if (createdByRaw != null) {
      createdByText = createdByRaw.toString();
    }

    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems
        .whereType<Map<String, dynamic>>()
        .map((e) => MenuItemModel.fromJson(e))
        .toList();

    final rawCondiments = json['condiments'] as List<dynamic>? ?? [];
    final condimentsList = rawCondiments
        .whereType<Map<String, dynamic>>()
        .map((e) => MenuCondimentModel.fromJson(e))
        .toList();

    final countMap = json['_count'] as Map<String, dynamic>?;
    final parsedCount = countMap != null && countMap['items'] != null
        ? _parseInt(countMap['items'])
        : (json['itemsCount'] != null
            ? _parseInt(json['itemsCount'])
            : itemsList.length);

    return MenuModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'OTHER',
      description: json['description']?.toString(),
      tags: json['tags']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      totalKcal: _parseDouble(json['totalKcal']),
      totalProtein: _parseDouble(json['totalProtein']),
      totalCarbs: _parseDouble(json['totalCarbs']),
      totalFats: _parseDouble(json['totalFats']),
      createdBy: createdByText,
      itemsCount: parsedCount,
      items: itemsList,
      condiments: condimentsList,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      publishedAt: json['publishedAt'] != null
          ? DateTime.tryParse(json['publishedAt'].toString())
          : null,
      canViewCondiments: json['canViewCondiments'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'description': description,
      'tags': tags,
      'imageUrl': imageUrl,
      'totalKcal': totalKcal,
      'totalProtein': totalProtein,
      'totalCarbs': totalCarbs,
      'totalFats': totalFats,
      'createdBy': createdBy,
      'itemsCount': itemsCount,
      'items': items.map((e) => e.toJson()).toList(),
      'condiments': condiments.map((e) => e.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'publishedAt': publishedAt?.toIso8601String(),
      'canViewCondiments': canViewCondiments,
    };
  }

  MenuModel copyWith({
    String? id,
    String? name,
    String? category,
    String? description,
    String? tags,
    String? imageUrl,
    double? totalKcal,
    double? totalProtein,
    double? totalCarbs,
    double? totalFats,
    String? createdBy,
    int? itemsCount,
    List<MenuItemModel>? items,
    List<MenuCondimentModel>? condiments,
    DateTime? createdAt,
    DateTime? publishedAt,
    bool? canViewCondiments,
  }) {
    return MenuModel(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      description: description ?? this.description,
      tags: tags ?? this.tags,
      imageUrl: imageUrl ?? this.imageUrl,
      totalKcal: totalKcal ?? this.totalKcal,
      totalProtein: totalProtein ?? this.totalProtein,
      totalCarbs: totalCarbs ?? this.totalCarbs,
      totalFats: totalFats ?? this.totalFats,
      createdBy: createdBy ?? this.createdBy,
      itemsCount: itemsCount ?? this.itemsCount,
      items: items ?? this.items,
      condiments: condiments ?? this.condiments,
      createdAt: createdAt ?? this.createdAt,
      publishedAt: publishedAt ?? this.publishedAt,
      canViewCondiments: canViewCondiments ?? this.canViewCondiments,
    );
  }
}
