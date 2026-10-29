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

class PaginatedResponse<T> {
  final List<T> items;
  final int total;
  final int currentPage;
  final int totalPages;
  final bool hasPrev;
  final bool hasNext;

  const PaginatedResponse({
    required this.items,
    required this.total,
    required this.currentPage,
    required this.totalPages,
    required this.hasPrev,
    required this.hasNext,
  });

  factory PaginatedResponse.empty({int page = 1}) {
    return PaginatedResponse(
      items: [],
      total: 0,
      currentPage: page,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    );
  }
}

class ExchangeListItemFoodModel {
  final String id;
  final String name;
  final String? category;
  final String? sub;
  final String? unity;
  final double calories;

  const ExchangeListItemFoodModel({
    required this.id,
    required this.name,
    this.category,
    this.sub,
    this.unity,
    this.calories = 0.0,
  });

  factory ExchangeListItemFoodModel.fromJson(Map<String, dynamic> json) {
    return ExchangeListItemFoodModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString(),
      sub: json['sub']?.toString(),
      unity: json['unity']?.toString(),
      calories: _parseDouble(json['calories']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'sub': sub,
      'unity': unity,
      'calories': calories,
    };
  }
}

class ExchangeListItemModel {
  final String id;
  final String exchangeListId;
  final double amount;
  final String? servingLabel;
  final ExchangeListItemFoodModel? food;

  const ExchangeListItemModel({
    required this.id,
    required this.exchangeListId,
    required this.amount,
    this.servingLabel,
    this.food,
  });

  factory ExchangeListItemModel.fromJson(Map<String, dynamic> json) {
    return ExchangeListItemModel(
      id: json['id']?.toString() ?? '',
      exchangeListId: json['exchangeListId']?.toString() ?? '',
      amount: json['amount'] != null ? _parseDouble(json['amount']) : 1.0,
      servingLabel: json['servingLabel']?.toString(),
      food: json['foodExchangeList'] is Map<String, dynamic>
          ? ExchangeListItemFoodModel.fromJson(json['foodExchangeList'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'exchangeListId': exchangeListId,
      'amount': amount,
      'servingLabel': servingLabel,
      'foodExchangeList': food?.toJson(),
    };
  }
}

class ExchangeListModel {
  final String id;
  final String? nutritionistId;
  final String name;
  final String? description;
  final int baseKcal;
  final double baseProtein;
  final double baseFat;
  final double baseCarbs;
  final int itemsCount;
  final List<ExchangeListItemModel> items;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ExchangeListModel({
    required this.id,
    this.nutritionistId,
    required this.name,
    this.description,
    required this.baseKcal,
    required this.baseProtein,
    required this.baseFat,
    required this.baseCarbs,
    this.itemsCount = 0,
    this.items = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory ExchangeListModel.fromJson(Map<String, dynamic> json) {
    final countMap = json['_count'] as Map<String, dynamic>?;
    final rawItems = json['items'] as List<dynamic>? ?? [];

    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    return ExchangeListModel(
      id: json['id']?.toString() ?? '',
      nutritionistId: json['nutritionistId']?.toString(),
      name: json['name']?.toString() ?? 'Lista de Intercambio',
      description: json['description']?.toString(),
      baseKcal: _parseInt(json['baseKcal']),
      baseProtein: _parseDouble(json['baseProtein']),
      baseFat: _parseDouble(json['baseFat']),
      baseCarbs: _parseDouble(json['baseCarbs']),
      itemsCount: countMap != null && countMap['items'] != null
          ? _parseInt(countMap['items'])
          : (json['itemsCount'] != null
              ? _parseInt(json['itemsCount'])
              : rawItems.length),
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map((e) => ExchangeListItemModel.fromJson(e))
          .toList(),
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nutritionistId': nutritionistId,
      'name': name,
      'description': description,
      'baseKcal': baseKcal,
      'baseProtein': baseProtein,
      'baseFat': baseFat,
      'baseCarbs': baseCarbs,
      'itemsCount': itemsCount,
      'items': items.map((e) => e.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class FoodExchangeModel {
  final String id;
  final String name;
  final String category;
  final String? sub;
  final String portion;
  final String equivalents;
  final String kcal;
  final String macros;

  const FoodExchangeModel({
    required this.id,
    required this.name,
    required this.category,
    this.sub,
    required this.portion,
    required this.equivalents,
    required this.kcal,
    required this.macros,
  });

  factory FoodExchangeModel.fromJson(Map<String, dynamic> json) {
    final cal = _parseDouble(json['calories']);
    final cat = json['category']?.toString() ?? 'Todos';
    final unity = json['unity']?.toString() ?? '1 porción';

    return FoodExchangeModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: cat,
      sub: json['sub']?.toString(),
      portion: unity,
      equivalents: json['equivalents']?.toString() ?? 'Equivalente estándar según grupo $cat',
      kcal: '${cal.toStringAsFixed(0)} kcal',
      macros: json['macros']?.toString() ?? 'Grupo: $cat',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'sub': sub,
      'portion': portion,
      'equivalents': equivalents,
      'kcal': kcal,
      'macros': macros,
    };
  }
}
