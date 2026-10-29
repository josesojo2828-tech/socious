import 'package:flutter/foundation.dart';

@immutable
class AppointmentModel {
  final String id;
  final String patientId;
  final String patientName;
  final String? patientDni;
  final String? patientAvatar;
  final DateTime date;
  final int durationMinutes;
  final String status; // 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'PENDING'
  final String modality; // 'PRESENCIAL', 'ONLINE'
  final String type; // 'INICIAL', 'CONTROL', 'ISAK', 'SEGUIMIENTO'
  final String? notes;
  final double? price;

  const AppointmentModel({
    required this.id,
    required this.patientId,
    required this.patientName,
    this.patientDni,
    this.patientAvatar,
    required this.date,
    this.durationMinutes = 45,
    this.status = 'SCHEDULED',
    this.modality = 'PRESENCIAL',
    this.type = 'CONTROL',
    this.notes,
    this.price = 15000.0,
  });

  bool get isScheduled => status.toUpperCase() == 'SCHEDULED';
  bool get isCompleted => status.toUpperCase() == 'COMPLETED';
  bool get isCancelled => status.toUpperCase() == 'CANCELLED';
  bool get isPending => status.toUpperCase() == 'PENDING';

  bool get isPresencial => modality.toUpperCase() == 'PRESENCIAL';
  bool get isOnline => modality.toUpperCase() == 'ONLINE';

  String get typeLabel {
    switch (type.toUpperCase()) {
      case 'INICIAL':
        return 'Consulta Inicial';
      case 'CONTROL':
        return 'Control Nutricional';
      case 'ISAK':
        return 'Evaluación ISAK';
      case 'SEGUIMIENTO':
        return 'Re-evaluación';
      default:
        return type;
    }
  }

  String get statusLabel {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return 'Agendada';
      case 'COMPLETED':
        return 'Cumplida';
      case 'CANCELLED':
        return 'Cancelada';
      case 'PENDING':
        return 'Pendiente';
      default:
        return status;
    }
  }

  DateTime get endDate => date.add(Duration(minutes: durationMinutes));

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      patientName: json['patientName']?.toString() ?? 'Paciente Desconocido',
      patientDni: json['patientDni']?.toString(),
      patientAvatar: json['patientAvatar']?.toString(),
      date: json['date'] != null
          ? DateTime.tryParse(json['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      durationMinutes: json['durationMinutes'] is int
          ? json['durationMinutes']
          : int.tryParse(json['durationMinutes']?.toString() ?? '45') ?? 45,
      status: json['status']?.toString().toUpperCase() ?? 'SCHEDULED',
      modality: json['modality']?.toString().toUpperCase() ?? 'PRESENCIAL',
      type: json['type']?.toString().toUpperCase() ?? 'CONTROL',
      notes: json['notes']?.toString(),
      price: json['price'] != null
          ? double.tryParse(json['price'].toString())
          : 15000.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'patientName': patientName,
      'patientDni': patientDni,
      'patientAvatar': patientAvatar,
      'date': date.toIso8601String(),
      'durationMinutes': durationMinutes,
      'status': status,
      'modality': modality,
      'type': type,
      'notes': notes,
      'price': price,
    };
  }

  AppointmentModel copyWith({
    String? id,
    String? patientId,
    String? patientName,
    String? patientDni,
    String? patientAvatar,
    DateTime? date,
    int? durationMinutes,
    String? status,
    String? modality,
    String? type,
    String? notes,
    double? price,
  }) {
    return AppointmentModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      patientName: patientName ?? this.patientName,
      patientDni: patientDni ?? this.patientDni,
      patientAvatar: patientAvatar ?? this.patientAvatar,
      date: date ?? this.date,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      status: status ?? this.status,
      modality: modality ?? this.modality,
      type: type ?? this.type,
      notes: notes ?? this.notes,
      price: price ?? this.price,
    );
  }
}
