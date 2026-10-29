class GISymptomItem {
  final bool active;
  final String frequency;

  const GISymptomItem({this.active = false, this.frequency = ''});

  factory GISymptomItem.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return GISymptomItem(
        active: json['active'] as bool? ?? false,
        frequency: json['frequency'] as String? ?? '',
      );
    } else if (json is bool) {
      return GISymptomItem(active: json, frequency: '');
    } else if (json is String && json.trim().isNotEmpty) {
      return GISymptomItem(active: true, frequency: json.trim());
    }
    return const GISymptomItem();
  }

  Map<String, dynamic> toJson() => {
        'active': active,
        'frequency': frequency,
      };
}

class EmotionalFactorItem {
  final bool active;
  final String frequency;

  const EmotionalFactorItem({this.active = false, this.frequency = ''});

  factory EmotionalFactorItem.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return EmotionalFactorItem(
        active: json['active'] as bool? ?? false,
        frequency: json['frequency'] as String? ?? '',
      );
    } else if (json is bool) {
      return EmotionalFactorItem(active: json, frequency: '');
    } else if (json is String && json.trim().isNotEmpty) {
      return EmotionalFactorItem(active: true, frequency: json.trim());
    }
    return const EmotionalFactorItem();
  }

  Map<String, dynamic> toJson() => {
        'active': active,
        'frequency': frequency,
      };
}

class GastrointestinalDisordersModel {
  final GISymptomItem vomiting;
  final GISymptomItem diarrhea;
  final GISymptomItem constipation;
  final GISymptomItem colitis;
  final GISymptomItem gastritis;
  final GISymptomItem nausea;
  final GISymptomItem reflux;
  final GISymptomItem dysphagia;
  final GISymptomItem flatulence;
  final GISymptomItem distension;
  final GISymptomItem pyrosis;

  const GastrointestinalDisordersModel({
    this.vomiting = const GISymptomItem(),
    this.diarrhea = const GISymptomItem(),
    this.constipation = const GISymptomItem(),
    this.colitis = const GISymptomItem(),
    this.gastritis = const GISymptomItem(),
    this.nausea = const GISymptomItem(),
    this.reflux = const GISymptomItem(),
    this.dysphagia = const GISymptomItem(),
    this.flatulence = const GISymptomItem(),
    this.distension = const GISymptomItem(),
    this.pyrosis = const GISymptomItem(),
  });

  factory GastrointestinalDisordersModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const GastrointestinalDisordersModel();
    return GastrointestinalDisordersModel(
      vomiting: GISymptomItem.fromJson(json['vomiting']),
      diarrhea: GISymptomItem.fromJson(json['diarrhea']),
      constipation: GISymptomItem.fromJson(json['constipation']),
      colitis: GISymptomItem.fromJson(json['colitis']),
      gastritis: GISymptomItem.fromJson(json['gastritis']),
      nausea: GISymptomItem.fromJson(json['nausea']),
      reflux: GISymptomItem.fromJson(json['reflux']),
      dysphagia: GISymptomItem.fromJson(json['dysphagia']),
      flatulence: GISymptomItem.fromJson(json['flatulence']),
      distension: GISymptomItem.fromJson(json['distension']),
      pyrosis: GISymptomItem.fromJson(json['pyrosis']),
    );
  }

  Map<String, dynamic> toJson() => {
        'vomiting': vomiting.toJson(),
        'diarrhea': diarrhea.toJson(),
        'constipation': constipation.toJson(),
        'colitis': colitis.toJson(),
        'gastritis': gastritis.toJson(),
        'nausea': nausea.toJson(),
        'reflux': reflux.toJson(),
        'dysphagia': dysphagia.toJson(),
        'flatulence': flatulence.toJson(),
        'distension': distension.toJson(),
        'pyrosis': pyrosis.toJson(),
      };

  bool get isEmpty =>
      !vomiting.active &&
      !diarrhea.active &&
      !constipation.active &&
      !colitis.active &&
      !gastritis.active &&
      !nausea.active &&
      !reflux.active &&
      !dysphagia.active &&
      !flatulence.active &&
      !distension.active &&
      !pyrosis.active;

  List<({String name, GISymptomItem item})> get activeList {
    final list = <({String name, GISymptomItem item})>[];
    if (vomiting.active) list.add((name: 'Vómitos', item: vomiting));
    if (diarrhea.active) list.add((name: 'Diarrea', item: diarrhea));
    if (constipation.active) list.add((name: 'Estreñimiento', item: constipation));
    if (colitis.active) list.add((name: 'Colitis', item: colitis));
    if (gastritis.active) list.add((name: 'Gastritis', item: gastritis));
    if (nausea.active) list.add((name: 'Náuseas', item: nausea));
    if (reflux.active) list.add((name: 'Reflujo', item: reflux));
    if (dysphagia.active) list.add((name: 'Disfagia', item: dysphagia));
    if (flatulence.active) list.add((name: 'Flatulencias', item: flatulence));
    if (distension.active) list.add((name: 'Distensión Abdominal', item: distension));
    if (pyrosis.active) list.add((name: 'Acidez / Pirosis', item: pyrosis));
    return list;
  }
}

class PersonalHistoryModel {
  final bool diabetes;
  final bool hypertension;
  final bool cancer;
  final bool obesity;
  final bool dislipidemia;
  final bool renalDiseases;
  final bool anemia;
  final String surgeries;
  final String others;
  final String currentMedications;
  final EmotionalFactorItem anxiety;
  final EmotionalFactorItem stress;
  final EmotionalFactorItem depression;

  const PersonalHistoryModel({
    this.diabetes = false,
    this.hypertension = false,
    this.cancer = false,
    this.obesity = false,
    this.dislipidemia = false,
    this.renalDiseases = false,
    this.anemia = false,
    this.surgeries = '',
    this.others = '',
    this.currentMedications = '',
    this.anxiety = const EmotionalFactorItem(),
    this.stress = const EmotionalFactorItem(),
    this.depression = const EmotionalFactorItem(),
  });

  factory PersonalHistoryModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const PersonalHistoryModel();
    return PersonalHistoryModel(
      diabetes: json['diabetes'] as bool? ?? false,
      hypertension: json['hypertension'] as bool? ?? false,
      cancer: json['cancer'] as bool? ?? false,
      obesity: json['obesity'] as bool? ?? false,
      dislipidemia: json['dislipidemia'] as bool? ?? false,
      renalDiseases: json['renalDiseases'] as bool? ?? false,
      anemia: json['anemia'] as bool? ?? false,
      surgeries: json['surgeries'] as String? ?? '',
      others: json['others'] as String? ?? '',
      currentMedications: json['currentMedications'] as String? ?? '',
      anxiety: EmotionalFactorItem.fromJson(json['anxiety']),
      stress: EmotionalFactorItem.fromJson(json['stress']),
      depression: EmotionalFactorItem.fromJson(json['depression']),
    );
  }

  Map<String, dynamic> toJson() => {
        'diabetes': diabetes,
        'hypertension': hypertension,
        'cancer': cancer,
        'obesity': obesity,
        'dislipidemia': dislipidemia,
        'renalDiseases': renalDiseases,
        'anemia': anemia,
        'surgeries': surgeries,
        'others': others,
        'currentMedications': currentMedications,
        'anxiety': anxiety.toJson(),
        'stress': stress.toJson(),
        'depression': depression.toJson(),
      };

  bool get isEmpty =>
      !diabetes &&
      !hypertension &&
      !cancer &&
      !obesity &&
      !dislipidemia &&
      !renalDiseases &&
      !anemia &&
      surgeries.isEmpty &&
      others.isEmpty &&
      currentMedications.isEmpty &&
      !anxiety.active &&
      !stress.active &&
      !depression.active;
}

class FamilyHistoryModel {
  final List<String> diabetes;
  final List<String> hypertension;
  final List<String> cancer;
  final List<String> dislipidemia;
  final List<String> anemia;
  final List<String> renalDiseases;
  final String others;
  final String currentMedications;

  const FamilyHistoryModel({
    this.diabetes = const [],
    this.hypertension = const [],
    this.cancer = const [],
    this.dislipidemia = const [],
    this.anemia = const [],
    this.renalDiseases = const [],
    this.others = '',
    this.currentMedications = '',
  });

  static List<String> _parseTags(dynamic val) {
    if (val == null || val == false) return const [];
    if (val == true) return const ['Familiar'];
    if (val is List) return val.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
    if (val is String && val.trim().isNotEmpty) return [val.trim()];
    return const [];
  }

  factory FamilyHistoryModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const FamilyHistoryModel();
    return FamilyHistoryModel(
      diabetes: _parseTags(json['diabetes']),
      hypertension: _parseTags(json['hypertension']),
      cancer: _parseTags(json['cancer']),
      dislipidemia: _parseTags(json['dislipidemia']),
      anemia: _parseTags(json['anemia']),
      renalDiseases: _parseTags(json['renalDiseases']),
      others: json['others'] as String? ?? '',
      currentMedications: json['currentMedications'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'diabetes': diabetes,
        'hypertension': hypertension,
        'cancer': cancer,
        'dislipidemia': dislipidemia,
        'anemia': anemia,
        'renalDiseases': renalDiseases,
        'others': others,
        'currentMedications': currentMedications,
      };

  bool get isEmpty =>
      diabetes.isEmpty &&
      hypertension.isEmpty &&
      cancer.isEmpty &&
      dislipidemia.isEmpty &&
      anemia.isEmpty &&
      renalDiseases.isEmpty &&
      others.isEmpty &&
      currentMedications.isEmpty;
}

class LifestyleModel {
  final String physicalActivity;
  final String exerciseFrequency;
  final double sleepHours;
  final bool smoking;
  final String smokingFrequency;
  final String alcohol;
  final String alcoholFrequency;
  final EmotionalFactorItem anxiety;
  final EmotionalFactorItem stress;
  final EmotionalFactorItem depression;

  const LifestyleModel({
    this.physicalActivity = '',
    this.exerciseFrequency = '',
    this.sleepHours = 7.0,
    this.smoking = false,
    this.smokingFrequency = '',
    this.alcohol = '',
    this.alcoholFrequency = '',
    this.anxiety = const EmotionalFactorItem(),
    this.stress = const EmotionalFactorItem(),
    this.depression = const EmotionalFactorItem(),
  });

  factory LifestyleModel.fromJson(Map<String, dynamic> json) {
    return LifestyleModel(
      physicalActivity: json['physicalActivity'] as String? ?? '',
      exerciseFrequency: json['exerciseFrequency'] as String? ?? '',
      sleepHours: (json['sleepHours'] as num?)?.toDouble() ?? 7.0,
      smoking: json['smoking'] as bool? ?? false,
      smokingFrequency: json['smokingFrequency'] as String? ?? '',
      alcohol: json['alcohol'] as String? ?? '',
      alcoholFrequency: json['alcoholFrequency'] as String? ?? '',
      anxiety: EmotionalFactorItem.fromJson(json['anxiety']),
      stress: EmotionalFactorItem.fromJson(json['stress']),
      depression: EmotionalFactorItem.fromJson(json['depression']),
    );
  }

  Map<String, dynamic> toJson() => {
        'physicalActivity': physicalActivity,
        'exerciseFrequency': exerciseFrequency,
        'sleepHours': sleepHours,
        'smoking': smoking,
        'smokingFrequency': smokingFrequency,
        'alcohol': alcohol,
        'alcoholFrequency': alcoholFrequency,
        'anxiety': anxiety.toJson(),
        'stress': stress.toJson(),
        'depression': depression.toJson(),
      };

  bool get isEmpty =>
      physicalActivity.isEmpty &&
      exerciseFrequency.isEmpty &&
      !smoking &&
      smokingFrequency.isEmpty &&
      alcohol.isEmpty &&
      alcoholFrequency.isEmpty &&
      !anxiety.active &&
      !stress.active &&
      !depression.active;
}

class GynecoObstetricModel {
  final int g;
  final int p;
  final int c;
  final String fum;
  final String fup;
  final String sdg;
  final String ppg;
  final String contraceptives;

  const GynecoObstetricModel({
    this.g = 0,
    this.p = 0,
    this.c = 0,
    this.fum = '',
    this.fup = '',
    this.sdg = '',
    this.ppg = '',
    this.contraceptives = '',
  });

  factory GynecoObstetricModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const GynecoObstetricModel();
    return GynecoObstetricModel(
      g: (json['g'] as num?)?.toInt() ?? 0,
      p: (json['p'] as num?)?.toInt() ?? 0,
      c: (json['c'] as num?)?.toInt() ?? 0,
      fum: json['fum'] as String? ?? '',
      fup: (json['fup'] as String?) ?? (json['fupc'] as String?) ?? '',
      sdg: json['sdg'] as String? ?? '',
      ppg: json['ppg'] as String? ?? '',
      contraceptives: json['contraceptives'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'g': g,
        'p': p,
        'c': c,
        'fum': fum,
        'fup': fup,
        'sdg': sdg,
        'ppg': ppg,
        'contraceptives': contraceptives,
      };

  bool get isEmpty =>
      g == 0 &&
      p == 0 &&
      c == 0 &&
      fum.isEmpty &&
      fup.isEmpty &&
      sdg.isEmpty &&
      ppg.isEmpty &&
      contraceptives.isEmpty;
}

class EatingHabitsModel {
  final String eatingCompanion;
  final String foodPreparer;
  final int mealsPerDay;
  final bool snacks;
  final String snackFoods;
  final String mealSchedule;
  final int mealsAtHome;
  final int mealsOut;
  final int weekendMealsOut;
  final String peakAppetiteTime;
  final String appetiteConsideration;
  final String appetiteChanges;

  const EatingHabitsModel({
    this.eatingCompanion = '',
    this.foodPreparer = '',
    this.mealsPerDay = 3,
    this.snacks = false,
    this.snackFoods = '',
    this.mealSchedule = '',
    this.mealsAtHome = 3,
    this.mealsOut = 0,
    this.weekendMealsOut = 0,
    this.peakAppetiteTime = '',
    this.appetiteConsideration = '',
    this.appetiteChanges = '',
  });

  factory EatingHabitsModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const EatingHabitsModel();
    return EatingHabitsModel(
      eatingCompanion: json['eatingCompanion'] as String? ?? '',
      foodPreparer: json['foodPreparer'] as String? ?? '',
      mealsPerDay: (json['mealsPerDay'] as num?)?.toInt() ?? 3,
      snacks: json['snacks'] as bool? ?? false,
      snackFoods: json['snackFoods'] as String? ?? '',
      mealSchedule: json['mealSchedule'] as String? ?? '',
      mealsAtHome: (json['mealsAtHome'] as num?)?.toInt() ?? 3,
      mealsOut: (json['mealsOut'] as num?)?.toInt() ?? 0,
      weekendMealsOut: (json['weekendMealsOut'] as num?)?.toInt() ?? 0,
      peakAppetiteTime: json['peakAppetiteTime'] as String? ?? '',
      appetiteConsideration: json['appetiteConsideration'] as String? ?? '',
      appetiteChanges: json['appetiteChanges'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'eatingCompanion': eatingCompanion,
        'foodPreparer': foodPreparer,
        'mealsPerDay': mealsPerDay,
        'snacks': snacks,
        'snackFoods': snackFoods,
        'mealSchedule': mealSchedule,
        'mealsAtHome': mealsAtHome,
        'mealsOut': mealsOut,
        'weekendMealsOut': weekendMealsOut,
        'peakAppetiteTime': peakAppetiteTime,
        'appetiteConsideration': appetiteConsideration,
        'appetiteChanges': appetiteChanges,
      };

  bool get isEmpty =>
      eatingCompanion.isEmpty &&
      foodPreparer.isEmpty &&
      peakAppetiteTime.isEmpty &&
      appetiteConsideration.isEmpty &&
      appetiteChanges.isEmpty;
}

class R24hRecallModel {
  final String breakfast;
  final String morningSnack;
  final String lunch;
  final String afternoonSnack;
  final String dinner;
  final String notes;

  const R24hRecallModel({
    this.breakfast = '',
    this.morningSnack = '',
    this.lunch = '',
    this.afternoonSnack = '',
    this.dinner = '',
    this.notes = '',
  });

  Map<String, dynamic> toJson() => {
        'breakfast': breakfast,
        'morningSnack': morningSnack,
        'lunch': lunch,
        'afternoonSnack': afternoonSnack,
        'dinner': dinner,
        'notes': notes,
      };

  factory R24hRecallModel.fromJson(Map<String, dynamic> json) => R24hRecallModel(
        breakfast: json['breakfast'] as String? ?? '',
        morningSnack: json['morningSnack'] as String? ?? '',
        lunch: json['lunch'] as String? ?? '',
        afternoonSnack: json['afternoonSnack'] as String? ?? '',
        dinner: json['dinner'] as String? ?? '',
        notes: json['notes'] as String? ?? '',
      );

  R24hRecallModel copyWith({
    String? breakfast,
    String? morningSnack,
    String? lunch,
    String? afternoonSnack,
    String? dinner,
    String? notes,
  }) {
    return R24hRecallModel(
      breakfast: breakfast ?? this.breakfast,
      morningSnack: morningSnack ?? this.morningSnack,
      lunch: lunch ?? this.lunch,
      afternoonSnack: afternoonSnack ?? this.afternoonSnack,
      dinner: dinner ?? this.dinner,
      notes: notes ?? this.notes,
    );
  }

  bool get isEmpty =>
      breakfast.isEmpty &&
      morningSnack.isEmpty &&
      lunch.isEmpty &&
      afternoonSnack.isEmpty &&
      dinner.isEmpty &&
      notes.isEmpty;
}

class AnamnesisModel {
  final String id;
  final String patientId;
  final DateTime updatedAt;

  // Modulos Principales
  final PersonalHistoryModel personalHistory;
  final FamilyHistoryModel familyHistory;
  final LifestyleModel lifestyle;
  final GastrointestinalDisordersModel gastrointestinalDisorders;
  final List<String> allergies;
  final List<String> intolerances;
  final List<String> dislikes;
  final List<String> preferredFoods;
  final EatingHabitsModel eatingHabits;
  final String peakAppetiteTime;
  final String previousDiets;
  final String weightLossMeds;
  final String supplements;
  final R24hRecallModel r24hRecall;
  final GynecoObstetricModel gynecoObstetric;
  final String nutritionalDiagnosis;

  // Raw / Legacy fallbacks
  final String rawPathologies;
  final String rawFamilyHistory;
  final String rawMedications;
  final List<String> rawDigestiveSymptoms;
  final String rawAllergiesAndIntolerances;
  final String physicalActivityLevel;
  final String sportsPracticed;
  final double dailyWaterLiters;

  AnamnesisModel({
    required this.id,
    required this.patientId,
    required this.updatedAt,
    PersonalHistoryModel? personalHistory,
    dynamic familyHistory,
    LifestyleModel? lifestyle,
    GastrointestinalDisordersModel? gastrointestinalDisorders,
    this.allergies = const [],
    this.intolerances = const [],
    this.dislikes = const [],
    this.preferredFoods = const [],
    this.eatingHabits = const EatingHabitsModel(),
    this.peakAppetiteTime = '',
    this.previousDiets = '',
    this.weightLossMeds = '',
    this.supplements = '',
    this.r24hRecall = const R24hRecallModel(),
    this.gynecoObstetric = const GynecoObstetricModel(),
    this.nutritionalDiagnosis = '',
    String? pathologies,
    String? medications,
    List<String>? digestiveSymptoms,
    String? allergiesAndIntolerances,
    this.physicalActivityLevel = 'Moderado',
    this.sportsPracticed = '',
    this.dailyWaterLiters = 2.0,
    double? sleepHours,
  })  : personalHistory = personalHistory ??
            PersonalHistoryModel(
              surgeries: pathologies ?? '',
              currentMedications: medications ?? '',
            ),
        familyHistory = familyHistory is FamilyHistoryModel
            ? familyHistory
            : FamilyHistoryModel(others: familyHistory is String ? familyHistory : ''),
        lifestyle = lifestyle ?? LifestyleModel(sleepHours: sleepHours ?? 7.0),
        gastrointestinalDisorders = gastrointestinalDisorders ?? const GastrointestinalDisordersModel(),
        rawPathologies = pathologies ?? '',
        rawFamilyHistory = familyHistory is String ? familyHistory : '',
        rawMedications = medications ?? '',
        rawDigestiveSymptoms = digestiveSymptoms ?? const [],
        rawAllergiesAndIntolerances = allergiesAndIntolerances ?? '';

  // Backward compatibility getters
  String get pathologies {
    if (rawPathologies.isNotEmpty) return rawPathologies;
    final list = <String>[];
    if (personalHistory.diabetes) list.add('Diabetes');
    if (personalHistory.hypertension) list.add('Hipertensión');
    if (personalHistory.cancer) list.add('Cáncer');
    if (personalHistory.obesity) list.add('Obesidad');
    if (personalHistory.dislipidemia) list.add('Dislipidemia');
    if (personalHistory.renalDiseases) list.add('Enfermedades Renales');
    if (personalHistory.anemia) list.add('Anemia');
    if (personalHistory.surgeries.isNotEmpty) list.add('Cirugías: ${personalHistory.surgeries}');
    if (personalHistory.others.isNotEmpty) list.add(personalHistory.others);
    return list.isNotEmpty ? list.join(', ') : '';
  }

  String get familyHistoryStr {
    if (rawFamilyHistory.isNotEmpty) return rawFamilyHistory;
    final list = <String>[];
    if (familyHistory.diabetes.isNotEmpty) list.add('Diabetes (${familyHistory.diabetes.join(', ')})');
    if (familyHistory.hypertension.isNotEmpty) list.add('Hipertensión (${familyHistory.hypertension.join(', ')})');
    if (familyHistory.cancer.isNotEmpty) list.add('Cáncer (${familyHistory.cancer.join(', ')})');
    if (familyHistory.dislipidemia.isNotEmpty) list.add('Dislipidemia (${familyHistory.dislipidemia.join(', ')})');
    if (familyHistory.anemia.isNotEmpty) list.add('Anemia (${familyHistory.anemia.join(', ')})');
    if (familyHistory.renalDiseases.isNotEmpty) list.add('Renales (${familyHistory.renalDiseases.join(', ')})');
    if (familyHistory.others.isNotEmpty) list.add(familyHistory.others);
    return list.isNotEmpty ? list.join(', ') : '';
  }

  String get medications {
    if (personalHistory.currentMedications.isNotEmpty) return personalHistory.currentMedications;
    return rawMedications;
  }

  List<String> get digestiveSymptoms {
    if (gastrointestinalDisorders.activeList.isNotEmpty) {
      return gastrointestinalDisorders.activeList.map((e) {
        return e.item.frequency.isNotEmpty ? '${e.name} (${e.item.frequency})' : e.name;
      }).toList();
    }
    return rawDigestiveSymptoms;
  }

  String get allergiesAndIntolerances {
    final list = [...allergies, ...intolerances];
    if (list.isNotEmpty) return list.join(', ');
    return rawAllergiesAndIntolerances;
  }

  double get sleepHours => lifestyle.sleepHours;

  bool get hasContent =>
      !personalHistory.isEmpty ||
      !familyHistory.isEmpty ||
      !lifestyle.isEmpty ||
      !gastrointestinalDisorders.isEmpty ||
      allergies.isNotEmpty ||
      intolerances.isNotEmpty ||
      dislikes.isNotEmpty ||
      preferredFoods.isNotEmpty ||
      !eatingHabits.isEmpty ||
      previousDiets.isNotEmpty ||
      weightLossMeds.isNotEmpty ||
      supplements.isNotEmpty ||
      !r24hRecall.isEmpty ||
      !gynecoObstetric.isEmpty ||
      nutritionalDiagnosis.isNotEmpty ||
      rawPathologies.isNotEmpty ||
      rawAllergiesAndIntolerances.isNotEmpty;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'updatedAt': updatedAt.toIso8601String(),
      'personalHistory': personalHistory.toJson(),
      'familyHistory': familyHistory.toJson(),
      'lifestyle': lifestyle.toJson(),
      'gastrointestinalDisorders': gastrointestinalDisorders.toJson(),
      'allergies': allergies,
      'intolerances': intolerances,
      'dislikes': dislikes,
      'preferredFoods': preferredFoods,
      'eatingHabits': eatingHabits.toJson(),
      'peakAppetiteTime': peakAppetiteTime,
      'previousDiets': previousDiets,
      'weightLossMeds': weightLossMeds,
      'supplements': supplements,
      'recall24h': r24hRecall.toJson(),
      'r24hRecall': r24hRecall.toJson(),
      'gynecoObstetric': gynecoObstetric.toJson(),
      'nutritionalDiagnosis': nutritionalDiagnosis,
      'pathologies': rawPathologies,
      'medications': rawMedications,
      'digestiveSymptoms': rawDigestiveSymptoms,
      'allergiesAndIntolerances': rawAllergiesAndIntolerances,
      'physicalActivityLevel': physicalActivityLevel,
      'sportsPracticed': sportsPracticed,
      'dailyWaterLiters': dailyWaterLiters,
    };
  }

  factory AnamnesisModel.fromJson(Map<String, dynamic> json) {
    PersonalHistoryModel personalHist = const PersonalHistoryModel();
    if (json['personalHistory'] is Map<String, dynamic>) {
      personalHist = PersonalHistoryModel.fromJson(json['personalHistory'] as Map<String, dynamic>);
    }

    FamilyHistoryModel familyHist = const FamilyHistoryModel();
    if (json['familyHistory'] is Map<String, dynamic>) {
      familyHist = FamilyHistoryModel.fromJson(json['familyHistory'] as Map<String, dynamic>);
    }

    GastrointestinalDisordersModel giDisorders = const GastrointestinalDisordersModel();
    if (json['gastrointestinalDisorders'] is Map<String, dynamic>) {
      giDisorders = GastrointestinalDisordersModel.fromJson(json['gastrointestinalDisorders'] as Map<String, dynamic>);
    }

    LifestyleModel lifestyleModel = LifestyleModel.fromJson(json);
    if (json['lifestyle'] is Map<String, dynamic>) {
      lifestyleModel = LifestyleModel.fromJson(json['lifestyle'] as Map<String, dynamic>);
    }

    GynecoObstetricModel gynecoModel = const GynecoObstetricModel();
    if (json['gynecoObstetric'] is Map<String, dynamic>) {
      gynecoModel = GynecoObstetricModel.fromJson(json['gynecoObstetric'] as Map<String, dynamic>);
    }

    EatingHabitsModel eatingHabitsModel = const EatingHabitsModel();
    if (json['eatingHabits'] is Map<String, dynamic>) {
      eatingHabitsModel = EatingHabitsModel.fromJson(json['eatingHabits'] as Map<String, dynamic>);
    }

    List<String> parseList(dynamic input) {
      if (input is List) return input.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
      return const [];
    }

    R24hRecallModel r24h = const R24hRecallModel();
    if (json['recall24h'] is Map<String, dynamic>) {
      r24h = R24hRecallModel.fromJson(json['recall24h'] as Map<String, dynamic>);
    } else if (json['r24hRecall'] is Map<String, dynamic>) {
      r24h = R24hRecallModel.fromJson(json['r24hRecall'] as Map<String, dynamic>);
    }

    return AnamnesisModel(
      id: json['id'] as String? ?? '',
      patientId: json['patientId'] as String? ?? '',
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      personalHistory: personalHist,
      familyHistory: json['familyHistory'] is Map<String, dynamic>
          ? familyHist
          : (json['familyHistory'] is String ? json['familyHistory'] as String : familyHist),
      lifestyle: lifestyleModel,
      gastrointestinalDisorders: giDisorders,
      allergies: parseList(json['allergies']),
      intolerances: parseList(json['intolerances']),
      dislikes: parseList(json['dislikes']),
      preferredFoods: parseList(json['preferredFoods']),
      eatingHabits: eatingHabitsModel,
      peakAppetiteTime: json['peakAppetiteTime'] as String? ?? eatingHabitsModel.peakAppetiteTime,
      previousDiets: json['previousDiets'] as String? ?? '',
      weightLossMeds: json['weightLossMeds'] as String? ?? '',
      supplements: json['supplements'] as String? ?? '',
      r24hRecall: r24h,
      gynecoObstetric: gynecoModel,
      nutritionalDiagnosis: json['nutritionalDiagnosis'] as String? ?? '',
      pathologies: json['pathologies'] as String? ?? '',
      medications: json['medications'] as String? ?? '',
      digestiveSymptoms: parseList(json['digestiveSymptoms']),
      allergiesAndIntolerances: json['allergiesAndIntolerances'] as String? ?? '',
      physicalActivityLevel: json['physicalActivityLevel'] as String? ?? json['physicalActivity'] as String? ?? 'Moderado',
      sportsPracticed: json['sportsPracticed'] as String? ?? '',
      dailyWaterLiters: (json['dailyWaterLiters'] as num?)?.toDouble() ?? 2.0,
    );
  }

  AnamnesisModel copyWith({
    String? id,
    String? patientId,
    DateTime? updatedAt,
    PersonalHistoryModel? personalHistory,
    dynamic familyHistory,
    LifestyleModel? lifestyle,
    GastrointestinalDisordersModel? gastrointestinalDisorders,
    List<String>? allergies,
    List<String>? intolerances,
    List<String>? dislikes,
    List<String>? preferredFoods,
    EatingHabitsModel? eatingHabits,
    String? peakAppetiteTime,
    String? previousDiets,
    String? weightLossMeds,
    String? supplements,
    R24hRecallModel? r24hRecall,
    GynecoObstetricModel? gynecoObstetric,
    String? nutritionalDiagnosis,
    String? rawPathologies,
    String? rawFamilyHistory,
    String? rawMedications,
    List<String>? rawDigestiveSymptoms,
    String? rawAllergiesAndIntolerances,
    String? physicalActivityLevel,
    String? sportsPracticed,
    double? dailyWaterLiters,
  }) {
    return AnamnesisModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      updatedAt: updatedAt ?? this.updatedAt,
      personalHistory: personalHistory ?? this.personalHistory,
      familyHistory: familyHistory ?? rawFamilyHistory ?? this.familyHistory,
      lifestyle: lifestyle ?? this.lifestyle,
      gastrointestinalDisorders: gastrointestinalDisorders ?? this.gastrointestinalDisorders,
      allergies: allergies ?? this.allergies,
      intolerances: intolerances ?? this.intolerances,
      dislikes: dislikes ?? this.dislikes,
      preferredFoods: preferredFoods ?? this.preferredFoods,
      eatingHabits: eatingHabits ?? this.eatingHabits,
      peakAppetiteTime: peakAppetiteTime ?? this.peakAppetiteTime,
      previousDiets: previousDiets ?? this.previousDiets,
      weightLossMeds: weightLossMeds ?? this.weightLossMeds,
      supplements: supplements ?? this.supplements,
      r24hRecall: r24hRecall ?? this.r24hRecall,
      gynecoObstetric: gynecoObstetric ?? this.gynecoObstetric,
      nutritionalDiagnosis: nutritionalDiagnosis ?? this.nutritionalDiagnosis,
      pathologies: rawPathologies ?? this.rawPathologies,
      medications: rawMedications ?? this.rawMedications,
      digestiveSymptoms: rawDigestiveSymptoms ?? this.rawDigestiveSymptoms,
      allergiesAndIntolerances: rawAllergiesAndIntolerances ?? this.rawAllergiesAndIntolerances,
      physicalActivityLevel: physicalActivityLevel ?? this.physicalActivityLevel,
      sportsPracticed: sportsPracticed ?? this.sportsPracticed,
      dailyWaterLiters: dailyWaterLiters ?? this.dailyWaterLiters,
    );
  }
}
