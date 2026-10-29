class InstitutionalFoodModel {
  final String id;
  final String title;
  final String category;
  final int targetRations;
  final String description;
  final String costPerRation;
  final double? vct;
  final DateTime? createdAt;

  const InstitutionalFoodModel({
    required this.id,
    required this.title,
    required this.category,
    required this.targetRations,
    required this.description,
    required this.costPerRation,
    this.vct,
    this.createdAt,
  });

  factory InstitutionalFoodModel.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    final title = json['title']?.toString() ?? json['name']?.toString() ?? 'Menú Colectivo';

    final actLevel = json['activityLevel']?.toString();
    final rawCategory = json['category']?.toString();
    final category = rawCategory ?? (actLevel != null ? 'Nivel $actLevel' : 'Institucional');

    final targetRations = (json['totalPeople'] as num?)?.toInt() ??
        (json['targetRations'] as num?)?.toInt() ??
        (json['rations'] as num?)?.toInt() ??
        0;

    final description = json['description']?.toString() ??
        'Simulación institucional de menú colectivo con escalado nutricional.';

    String costStr = 'N/A';
    if (json['costPerCapita'] != null) {
      final c = (json['costPerCapita'] as num).toDouble();
      costStr = '\$${c.toStringAsFixed(2)} / ración';
    } else if (json['menus'] is List && (json['menus'] as List).isNotEmpty) {
      final firstMenu = (json['menus'] as List).first;
      if (firstMenu is Map<String, dynamic> && firstMenu['costPerCapita'] != null) {
        final c = (firstMenu['costPerCapita'] as num).toDouble();
        costStr = '\$${c.toStringAsFixed(2)} / ración';
      }
    } else if (json['costPerRation'] != null) {
      costStr = json['costPerRation'].toString();
    }

    final vct = (json['vct'] as num?)?.toDouble();

    DateTime? date;
    if (json['createdAt'] != null) {
      date = DateTime.tryParse(json['createdAt'].toString());
    }

    return InstitutionalFoodModel(
      id: id,
      title: title,
      category: category,
      targetRations: targetRations,
      description: description,
      costPerRation: costStr,
      vct: vct,
      createdAt: date,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'targetRations': targetRations,
      'description': description,
      'costPerRation': costPerRation,
      'vct': vct,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
