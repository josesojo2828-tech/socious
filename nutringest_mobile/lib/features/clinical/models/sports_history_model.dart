import 'package:flutter/foundation.dart';

@immutable
class SportPracticeModel {
  final String? id;
  final String? sportDisciplineId;
  final String name;
  final String? code;
  final double? metValue;
  final String? category;
  final double? trainingMinutesPerSession;
  final double? trainingDaysPerWeek;
  final double? trainingSessionsPerDay;
  final String? level;

  const SportPracticeModel({
    this.id,
    this.sportDisciplineId,
    this.name = 'Disciplina',
    this.code,
    this.metValue,
    this.category,
    this.trainingMinutesPerSession,
    this.trainingDaysPerWeek,
    this.trainingSessionsPerDay,
    this.level,
  });

  factory SportPracticeModel.fromJson(Map<String, dynamic> json) {
    return SportPracticeModel(
      id: json['id']?.toString(),
      sportDisciplineId: (json['sportDisciplineId'] ?? json['disciplineId'] ?? json['id'])?.toString(),
      name: (json['name'] ?? json['disciplineName'] ?? 'Disciplina').toString(),
      code: json['code']?.toString(),
      metValue: ((json['metValue'] ?? json['met']) as num?)?.toDouble(),
      category: json['category']?.toString(),
      trainingMinutesPerSession: ((json['trainingMinutesPerSession'] ?? json['minutesPerSession']) as num?)?.toDouble(),
      trainingDaysPerWeek: ((json['trainingDaysPerWeek'] ?? json['daysPerWeek']) as num?)?.toDouble(),
      trainingSessionsPerDay: ((json['trainingSessionsPerDay'] ?? json['sessionsPerDay']) as num?)?.toDouble(),
      level: (json['competitionLevel'] ?? json['level'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sportDisciplineId': sportDisciplineId,
      'name': name,
      'code': code,
      'metValue': metValue,
      'category': category,
      'trainingMinutesPerSession': trainingMinutesPerSession,
      'trainingDaysPerWeek': trainingDaysPerWeek,
      'trainingSessionsPerDay': trainingSessionsPerDay,
      'level': level,
    };
  }

  double getEffectiveMinutes([double fallback = 60.0]) =>
      (trainingMinutesPerSession != null && trainingMinutesPerSession! > 0)
          ? trainingMinutesPerSession!
          : fallback;

  double getEffectiveDays([double fallback = 3.0]) =>
      (trainingDaysPerWeek != null && trainingDaysPerWeek! > 0)
          ? trainingDaysPerWeek!
          : fallback;

  double getEffectiveSessions([double fallback = 1.0]) =>
      (trainingSessionsPerDay != null && trainingSessionsPerDay! > 0)
          ? trainingSessionsPerDay!
          : fallback;

  double getEffectiveMet([double fallback = 6.0]) =>
      (metValue != null && metValue! > 0) ? metValue! : fallback;

  String getEffectiveLevel([String fallback = 'Recreativo']) =>
      (level != null && level!.trim().isNotEmpty) ? level!.trim() : fallback;

  /// Gasto energético diario según METs institucional (Paso 0-D)
  double calculateDailyMetsKcal(
    double weight, {
    double fallbackMinutes = 60.0,
    double fallbackDays = 3.0,
    double fallbackSessions = 1.0,
  }) {
    final effectiveWeight = weight > 0 ? weight : 70.0;
    final met = getEffectiveMet(6.0);
    final minPerSess = getEffectiveMinutes(fallbackMinutes);
    final daysPerWk = getEffectiveDays(fallbackDays);
    final sessPerDay = getEffectiveSessions(fallbackSessions);

    final promedioMin = (minPerSess * daysPerWk * sessPerDay) / 7.0;
    final mlO2 = met * 3.5;
    final ltO2 = (effectiveWeight * mlO2) / 1000.0;
    final kcalMin = ltO2 * 5.0;
    return kcalMin * promedioMin;
  }
}

@immutable
class SportsHistoryModel {
  final String id;
  final String patientId;
  final String? background;
  final List<String> goals;
  final String? assessment;
  final String? competitionLevel;
  final double? trainingMinutesPerSession;
  final double? trainingDaysPerWeek;
  final double? trainingSessionsPerDay;
  final double? weightKg;
  final double? fatPercentage;
  final double? ffmKg;
  final double? cunninghamRmr;
  final double? metsExpenditure;
  final List<String> disciplineIds;
  final List<SportPracticeModel> disciplines;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const SportsHistoryModel({
    required this.id,
    required this.patientId,
    this.background,
    this.goals = const [],
    this.assessment,
    this.competitionLevel,
    this.trainingMinutesPerSession,
    this.trainingDaysPerWeek,
    this.trainingSessionsPerDay,
    this.weightKg,
    this.fatPercentage,
    this.ffmKg,
    this.cunninghamRmr,
    this.metsExpenditure,
    this.disciplineIds = const [],
    this.disciplines = const [],
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  List<SportPracticeModel> get practices => disciplines;

  bool get hasPractices => disciplines.isNotEmpty;

  double get calculatedTotal => (cunninghamRmr ?? 0) + (metsExpenditure ?? 0);

  /// Cunningham RMR formula: 500 + 22 * FFM kg
  static double calculateCunninghamRmr(double ffmKg) {
    final effectiveFfm = ffmKg > 0 ? ffmKg : 50.0;
    return 500.0 + (22.0 * effectiveFfm);
  }

  /// Calcula el gasto total diario en METs iterando las disciplinas
  double calculateTotalDailyMets(double weight) {
    if (disciplines.isEmpty) return 0.0;
    double sum = 0.0;
    for (final p in disciplines) {
      sum += p.calculateDailyMetsKcal(
        weight,
        fallbackMinutes: trainingMinutesPerSession ?? 60.0,
        fallbackDays: trainingDaysPerWeek ?? 3.0,
        fallbackSessions: trainingSessionsPerDay ?? 1.0,
      );
    }
    return sum;
  }

  factory SportsHistoryModel.fromJson(Map<String, dynamic> json) {
    final parentMinutes = (json['trainingMinutesPerSession'] as num?)?.toDouble();
    final parentDays = (json['trainingDaysPerWeek'] as num?)?.toDouble();
    final parentSessions = (json['trainingSessionsPerDay'] as num?)?.toDouble();
    final parentLevel = json['competitionLevel']?.toString();

    List<SportPracticeModel> parsedDisciplines = [];
    if (json['disciplines'] is List) {
      parsedDisciplines = (json['disciplines'] as List)
          .whereType<Map>()
          .map((e) => SportPracticeModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } else if (json['practices'] is List) {
      parsedDisciplines = (json['practices'] as List)
          .whereType<Map>()
          .map((e) => SportPracticeModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    parsedDisciplines = parsedDisciplines.map((d) {
      return SportPracticeModel(
        id: d.id,
        sportDisciplineId: d.sportDisciplineId,
        name: d.name,
        code: d.code,
        metValue: d.metValue,
        category: d.category,
        trainingMinutesPerSession: d.trainingMinutesPerSession ?? parentMinutes,
        trainingDaysPerWeek: d.trainingDaysPerWeek ?? parentDays,
        trainingSessionsPerDay: d.trainingSessionsPerDay ?? parentSessions,
        level: d.level ?? parentLevel,
      );
    }).toList();

    List<String> parsedGoals = [];
    if (json['goals'] is List) {
      parsedGoals = (json['goals'] as List).map((e) => e.toString()).toList();
    }

    List<String> parsedDisciplineIds = [];
    if (json['disciplineIds'] is List) {
      parsedDisciplineIds = (json['disciplineIds'] as List).map((e) => e.toString()).toList();
    }

    DateTime? parseDate(dynamic val) {
      if (val == null) return null;
      if (val is DateTime) return val;
      return DateTime.tryParse(val.toString());
    }

    return SportsHistoryModel(
      id: (json['id'] ?? '').toString(),
      patientId: (json['patientId'] ?? '').toString(),
      background: json['background']?.toString(),
      goals: parsedGoals,
      assessment: json['assessment']?.toString(),
      competitionLevel: json['competitionLevel']?.toString(),
      trainingMinutesPerSession: (json['trainingMinutesPerSession'] as num?)?.toDouble(),
      trainingDaysPerWeek: (json['trainingDaysPerWeek'] as num?)?.toDouble(),
      trainingSessionsPerDay: (json['trainingSessionsPerDay'] as num?)?.toDouble(),
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      fatPercentage: (json['fatPercentage'] as num?)?.toDouble(),
      ffmKg: (json['ffmKg'] as num?)?.toDouble(),
      cunninghamRmr: (json['cunninghamRmr'] as num?)?.toDouble(),
      metsExpenditure: (json['metsExpenditure'] as num?)?.toDouble(),
      disciplineIds: parsedDisciplineIds,
      disciplines: parsedDisciplines,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'background': background,
      'goals': goals,
      'assessment': assessment,
      'competitionLevel': competitionLevel,
      'trainingMinutesPerSession': trainingMinutesPerSession,
      'trainingDaysPerWeek': trainingDaysPerWeek,
      'trainingSessionsPerDay': trainingSessionsPerDay,
      'weightKg': weightKg,
      'fatPercentage': fatPercentage,
      'ffmKg': ffmKg,
      'cunninghamRmr': cunninghamRmr,
      'metsExpenditure': metsExpenditure,
      'disciplineIds': disciplineIds,
      'disciplines': disciplines.map((e) => e.toJson()).toList(),
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}
