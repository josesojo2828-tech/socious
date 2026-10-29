import '../utils/isak_calculator.dart';

class AnthropometryModel {
  final String id;
  final String patientId;
  final DateTime date;
  final double weight;
  final double height;
  final double age;
  final String gender; // 'MALE' | 'FEMALE'

  // Pliegues Cutáneos (mm)
  final double triceps;
  final double subscapular;
  final double supraspinale;
  final double abdominal;
  final double thigh;
  final double calf;
  final double biceps;
  final double iliacCrest;

  // Perímetros / Perímetros corporales (cm)
  final double armRelaxed;
  final double armFlexed;
  final double waist;
  final double hip;
  final double thighGirth;
  final double calfGirth;

  // Diámetros Óseos (cm)
  final double wrist;
  final double humerus;
  final double femur;

  final String? notes;

  AnthropometryModel({
    required this.id,
    required this.patientId,
    required this.date,
    required this.weight,
    required this.height,
    required this.age,
    required this.gender,
    required this.triceps,
    required this.subscapular,
    required this.supraspinale,
    required this.abdominal,
    required this.thigh,
    required this.calf,
    this.biceps = 0.0,
    this.iliacCrest = 0.0,
    required this.armRelaxed,
    required this.armFlexed,
    required this.waist,
    required this.hip,
    required this.thighGirth,
    required this.calfGirth,
    required this.wrist,
    required this.humerus,
    required this.femur,
    this.notes,
  });

  bool get isMale => gender.toUpperCase() == 'MALE' || gender.toUpperCase() == 'M';

  /// Resultado ISAK calculado en tiempo real
  IsakResult get isakResult {
    return IsakCalculator.computeFullIsak(
      weightKg: weight,
      heightCm: height,
      age: age,
      isMale: isMale,
      tricepsMm: triceps,
      subscapularMm: subscapular,
      supraspinaleMm: supraspinale,
      abdominalMm: abdominal,
      thighMm: thigh,
      calfMm: calf,
      armRelaxedGirthCm: armRelaxed,
      armFlexedGirthCm: armFlexed,
      waistGirthCm: waist,
      hipGirthCm: hip,
      thighGirthCm: thighGirth,
      calfGirthCm: calfGirth,
      humerusDiameterCm: humerus,
      femurDiameterCm: femur,
      wristDiameterCm: wrist,
    );
  }

  /// IMC (kg/m²)
  double get imc {
    if (height <= 0) return 0.0;
    final heightM = height / 100.0;
    return double.parse((weight / (heightM * heightM)).toStringAsFixed(1));
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'date': date.toIso8601String(),
      'weight': weight,
      'height': height,
      'age': age,
      'gender': gender,
      'triceps': triceps,
      'subscapular': subscapular,
      'supraspinale': supraspinale,
      'abdominal': abdominal,
      'thigh': thigh,
      'calf': calf,
      'biceps': biceps,
      'iliacCrest': iliacCrest,
      'armRelaxed': armRelaxed,
      'armFlexed': armFlexed,
      'waist': waist,
      'hip': hip,
      'thighGirth': thighGirth,
      'calfGirth': calfGirth,
      'wrist': wrist,
      'humerus': humerus,
      'femur': femur,
      'notes': notes,
      'isakResult': isakResult.toJson(),
    };
  }

  factory AnthropometryModel.fromJson(Map<String, dynamic> json) {
    return AnthropometryModel(
      id: json['id'] as String? ?? '',
      patientId: json['patientId'] as String? ?? '',
      date: json['date'] != null ? DateTime.parse(json['date'] as String) : DateTime.now(),
      weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      height: (json['height'] as num?)?.toDouble() ?? 0.0,
      age: (json['age'] as num?)?.toDouble() ?? 30.0,
      gender: json['gender'] as String? ?? 'MALE',
      triceps: (json['triceps'] as num?)?.toDouble() ?? 0.0,
      subscapular: (json['subscapular'] as num?)?.toDouble() ?? 0.0,
      supraspinale: (json['supraspinale'] as num?)?.toDouble() ?? 0.0,
      abdominal: (json['abdominal'] as num?)?.toDouble() ?? 0.0,
      thigh: (json['thigh'] as num?)?.toDouble() ?? 0.0,
      calf: (json['calf'] as num?)?.toDouble() ?? 0.0,
      biceps: (json['biceps'] as num?)?.toDouble() ?? 0.0,
      iliacCrest: (json['iliacCrest'] as num?)?.toDouble() ?? 0.0,
      armRelaxed: (json['armRelaxed'] as num?)?.toDouble() ?? 0.0,
      armFlexed: (json['armFlexed'] as num?)?.toDouble() ?? 0.0,
      waist: (json['waist'] as num?)?.toDouble() ?? 0.0,
      hip: (json['hip'] as num?)?.toDouble() ?? 0.0,
      thighGirth: (json['thighGirth'] as num?)?.toDouble() ?? 0.0,
      calfGirth: (json['calfGirth'] as num?)?.toDouble() ?? 0.0,
      wrist: (json['wrist'] as num?)?.toDouble() ?? 0.0,
      humerus: (json['humerus'] as num?)?.toDouble() ?? 0.0,
      femur: (json['femur'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'] as String?,
    );
  }

  AnthropometryModel copyWith({
    String? id,
    String? patientId,
    DateTime? date,
    double? weight,
    double? height,
    double? age,
    String? gender,
    double? triceps,
    double? subscapular,
    double? supraspinale,
    double? abdominal,
    double? thigh,
    double? calf,
    double? biceps,
    double? iliacCrest,
    double? armRelaxed,
    double? armFlexed,
    double? waist,
    double? hip,
    double? thighGirth,
    double? calfGirth,
    double? wrist,
    double? humerus,
    double? femur,
    String? notes,
  }) {
    return AnthropometryModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      date: date ?? this.date,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      triceps: triceps ?? this.triceps,
      subscapular: subscapular ?? this.subscapular,
      supraspinale: supraspinale ?? this.supraspinale,
      abdominal: abdominal ?? this.abdominal,
      thigh: thigh ?? this.thigh,
      calf: calf ?? this.calf,
      biceps: biceps ?? this.biceps,
      iliacCrest: iliacCrest ?? this.iliacCrest,
      armRelaxed: armRelaxed ?? this.armRelaxed,
      armFlexed: armFlexed ?? this.armFlexed,
      waist: waist ?? this.waist,
      hip: hip ?? this.hip,
      thighGirth: thighGirth ?? this.thighGirth,
      calfGirth: calfGirth ?? this.calfGirth,
      wrist: wrist ?? this.wrist,
      humerus: humerus ?? this.humerus,
      femur: femur ?? this.femur,
      notes: notes ?? this.notes,
    );
  }
}
