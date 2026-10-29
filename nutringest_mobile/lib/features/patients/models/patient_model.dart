import 'package:flutter/foundation.dart';

@immutable
class PatientModel {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? dni;
  final DateTime? birthDate;
  final String? gender; // 'MALE', 'FEMALE', 'OTHER'
  final String status; // 'ACTIVE', 'INACTIVE'
  final String? objective;
  final DateTime? lastConsultationDate;
  final String? avatarUrl;
  final String? address;
  final String? emergencyContact;
  final bool isPediatric;
  final bool isSports;
  final double? weight;
  final double? height;
  final String? ownerName;
  final String? ownerEmail;
  final int teamCount;

  const PatientModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.dni,
    this.birthDate,
    this.gender,
    this.status = 'ACTIVE',
    this.objective,
    this.lastConsultationDate,
    this.avatarUrl,
    this.address,
    this.emergencyContact,
    this.isPediatric = false,
    this.isSports = false,
    this.weight,
    this.height,
    this.ownerName,
    this.ownerEmail,
    this.teamCount = 0,
  });

  /// Nombre completo del paciente
  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isNotEmpty ? name : 'Sin Nombre';
  }

  /// Iniciales en mayúsculas para avatar (ej. "SR", "MG")
  String get initials {
    final f = firstName.trim().isNotEmpty ? firstName.trim()[0].toUpperCase() : '';
    final l = lastName.trim().isNotEmpty ? lastName.trim()[0].toUpperCase() : '';
    final combined = '$f$l';
    if (combined.isNotEmpty) return combined;
    return fullName.isNotEmpty ? fullName[0].toUpperCase() : 'P';
  }

  /// Edad calculada en años completos según fecha de nacimiento
  int? get age {
    if (birthDate == null) return null;
    final today = DateTime.now();
    int years = today.year - birthDate!.year;
    if (today.month < birthDate!.month ||
        (today.month == birthDate!.month && today.day < birthDate!.day)) {
      years--;
    }
    return years >= 0 ? years : 0;
  }

  /// Formato de enlace directo a WhatsApp (ej. https://wa.me/5491155448821)
  String get whatsappUrl {
    if (phone == null || phone!.trim().isEmpty) return '';
    final cleanDigits = phone!.replaceAll(RegExp(r'[^\d]'), '');
    if (cleanDigits.isEmpty) return '';
    return 'https://wa.me/$cleanDigits';
  }

  /// Indica si el paciente está activo
  bool get isActive => status.toUpperCase() == 'ACTIVE';

  factory PatientModel.fromJson(Map<String, dynamic> json) {
    // Unpack nested maps: patientProfile or user
    final profile = json['patientProfile'] is Map<String, dynamic>
        ? json['patientProfile'] as Map<String, dynamic>
        : (json['profile'] is Map<String, dynamic>
            ? json['profile'] as Map<String, dynamic>
            : null);

    final user = json['user'] is Map<String, dynamic>
        ? json['user'] as Map<String, dynamic>
        : null;

    dynamic getField(String key) {
      if (profile != null && profile.containsKey(key) && profile[key] != null) {
        return profile[key];
      }
      if (user != null && user.containsKey(key) && user[key] != null) {
        return user[key];
      }
      return json[key];
    }

    String? parseString(dynamic val) {
      if (val == null) return null;
      final str = val.toString().trim();
      return str.isNotEmpty ? str : null;
    }

    DateTime? parseDate(dynamic dateVal) {
      if (dateVal == null) return null;
      if (dateVal is DateTime) return dateVal;
      try {
        final str = dateVal.toString().trim();
        if (str.isEmpty) return null;
        return DateTime.tryParse(str);
      } catch (_) {
        return null;
      }
    }

    // Extract ID safely (checking profile['id'], user['id'], json['id'])
    final rawId = getField('id') ?? getField('_id') ?? json['id'] ?? profile?['id'] ?? user?['id'];
    final id = rawId != null ? rawId.toString() : '';

    // Extract First & Last Name or construct from name / fullName
    String firstName = (getField('firstName') ?? getField('first_name') ?? '').toString().trim();
    String lastName = (getField('lastName') ?? getField('last_name') ?? '').toString().trim();

    if (firstName.isEmpty && lastName.isEmpty) {
      final rawName = (getField('fullName') ?? getField('full_name') ?? getField('name') ?? '').toString().trim();
      if (rawName.isNotEmpty) {
        final parts = rawName.split(RegExp(r'\s+'));
        firstName = parts.first;
        if (parts.length > 1) {
          lastName = parts.sublist(1).join(' ');
        }
      }
    }

    final statusVal = parseString(getField('status')) ?? 'ACTIVE';

    final bool isPediatricVal = (json['isPediatric'] == true) ||
        (json['is_pediatric'] == true) ||
        (json['patientProfile']?['isPediatric'] == true) ||
        (getField('isPediatric') == true) ||
        (getField('is_pediatric') == true);

    final bool isSportsVal = (json['isSports'] == true) ||
        (json['is_sports'] == true) ||
        (json['patientProfile']?['isSports'] == true) ||
        (getField('isSports') == true) ||
        (getField('is_sports') == true);

    // Parse owner name & owner email
    String? ownerNameVal = parseString(
      getField('ownerName') ??
          getField('mainNutritionist') ??
          getField('createdByName') ??
          getField('primaryNutritionistName') ??
          getField('owner_name'),
    );

    if (ownerNameVal == null) {
      final ownerObj = json['owner'] is Map<String, dynamic>
          ? json['owner'] as Map<String, dynamic>
          : (getField('owner') is Map<String, dynamic> ? getField('owner') as Map<String, dynamic> : null);
      if (ownerObj != null) {
        final fn = parseString(ownerObj['firstName'] ?? ownerObj['first_name']) ?? '';
        final ln = parseString(ownerObj['lastName'] ?? ownerObj['last_name']) ?? '';
        final combined = '$fn $ln'.trim();
        ownerNameVal = combined.isNotEmpty
            ? combined
            : parseString(ownerObj['name'] ?? ownerObj['fullName'] ?? ownerObj['username'] ?? ownerObj['email']);
      }
    }

    String? ownerEmailVal = parseString(
      getField('ownerEmail') ?? getField('owner_email'),
    );
    if (ownerEmailVal == null && json['owner'] is Map<String, dynamic>) {
      ownerEmailVal = parseString((json['owner'] as Map<String, dynamic>)['email']);
    }

    // Parse team count
    int teamCountVal = 0;
    final rawTeamCount = getField('teamCount') ?? getField('teamMembersCount') ?? getField('sharedTeamMembersCount') ?? getField('assignedTeamCount');
    if (rawTeamCount != null && rawTeamCount is num) {
      teamCountVal = rawTeamCount.toInt();
    } else {
      final memberships = json['patientProfile']?['nutritionists'] ??
          json['nutritionists'] ??
          (json['patientProfiles'] is List && (json['patientProfiles'] as List).isNotEmpty
              ? json['patientProfiles'][0]['nutritionists']
              : null) ??
          json['teamMembers'] ??
          json['sharedTeamMembers'] ??
          json['sharedWith'];
      if (memberships is List) {
        final activeMembers = memberships.where((m) {
          if (m is Map<String, dynamic>) {
            if (m.containsKey('isActive')) return m['isActive'] == true;
            if (m.containsKey('status')) return (m['status'] as String).toUpperCase() == 'ACTIVE';
          }
          return true;
        }).length;
        teamCountVal = activeMembers;
      }
    }

    if (ownerNameVal == null) {
      final memberships = json['patientProfile']?['nutritionists'] ??
          json['nutritionists'] ??
          (json['patientProfiles'] is List && (json['patientProfiles'] as List).isNotEmpty
              ? json['patientProfiles'][0]['nutritionists']
              : null) ??
          json['teamMembers'] ??
          json['sharedTeamMembers'];
      if (memberships is List) {
        for (final m in memberships) {
          if (m is Map<String, dynamic>) {
            final role = (m['role'] ?? '').toString().toUpperCase();
            if (role == 'PRIMARY' || m['isPrimary'] == true) {
              final nut = m['nutritionist'] is Map<String, dynamic> ? m['nutritionist'] as Map<String, dynamic> : m;
              final usr = nut['user'] is Map<String, dynamic> ? nut['user'] as Map<String, dynamic> : nut;
              final fn = parseString(usr['firstName'] ?? usr['first_name']) ?? '';
              final ln = parseString(usr['lastName'] ?? usr['last_name']) ?? '';
              final combined = '$fn $ln'.trim();
              if (combined.isNotEmpty) {
                ownerNameVal = combined;
              } else {
                ownerNameVal = parseString(usr['fullName'] ?? usr['name'] ?? usr['email']);
              }
              ownerEmailVal ??= parseString(usr['email']);
              break;
            }
          }
        }
      }
    }

    return PatientModel(
      id: id,
      firstName: firstName,
      lastName: lastName,
      email: parseString(getField('email')),
      phone: parseString(getField('phone') ?? getField('phoneNumber') ?? getField('mobile')),
      dni: parseString(getField('dni') ?? getField('documentNumber') ?? getField('document')),
      birthDate: parseDate(getField('birthDate') ?? getField('birthdate') ?? getField('dateOfBirth')),
      gender: parseString(getField('gender')),
      status: statusVal.toUpperCase(),
      objective: parseString(getField('objective') ?? getField('goal')),
      lastConsultationDate: parseDate(getField('lastConsultationDate') ?? getField('lastConsultation')),
      avatarUrl: parseString(getField('avatarUrl') ?? getField('avatar') ?? getField('photo')),
      address: parseString(getField('address')),
      emergencyContact: parseString(getField('emergencyContact') ?? getField('emergency_contact')),
      isPediatric: isPediatricVal,
      isSports: isSportsVal,
      weight: ((getField('weight') ?? getField('weightKg')) as num?)?.toDouble(),
      height: ((getField('height') ?? getField('heightCm')) as num?)?.toDouble(),
      ownerName: ownerNameVal,
      ownerEmail: ownerEmailVal,
      teamCount: teamCountVal,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'dni': dni,
      'birthDate': birthDate?.toIso8601String(),
      'gender': gender,
      'status': status,
      'objective': objective,
      'lastConsultationDate': lastConsultationDate?.toIso8601String(),
      'avatarUrl': avatarUrl,
      'address': address,
      'emergencyContact': emergencyContact,
      'isPediatric': isPediatric,
      'isSports': isSports,
      'weight': weight,
      'height': height,
      'ownerName': ownerName,
      'ownerEmail': ownerEmail,
      'teamCount': teamCount,
    };
  }

  PatientModel copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? dni,
    DateTime? birthDate,
    String? gender,
    String? status,
    String? objective,
    DateTime? lastConsultationDate,
    String? avatarUrl,
    String? address,
    String? emergencyContact,
    bool? isPediatric,
    bool? isSports,
    double? weight,
    double? height,
    String? ownerName,
    String? ownerEmail,
    int? teamCount,
  }) {
    return PatientModel(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      dni: dni ?? this.dni,
      birthDate: birthDate ?? this.birthDate,
      gender: gender ?? this.gender,
      status: status ?? this.status,
      objective: objective ?? this.objective,
      lastConsultationDate: lastConsultationDate ?? this.lastConsultationDate,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      address: address ?? this.address,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      isPediatric: isPediatric ?? this.isPediatric,
      isSports: isSports ?? this.isSports,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      ownerName: ownerName ?? this.ownerName,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      teamCount: teamCount ?? this.teamCount,
    );
  }

  /// Paciente por defecto para navegaciones globales y previsualizaciones
  static PatientModel get defaultPatient => PatientModel(
        id: 'pat-101',
        firstName: 'Sofía',
        lastName: 'Rodríguez',
        email: 'sofia.rodriguez@email.com',
        phone: '+5491134567890',
        dni: '41.892.301',
        birthDate: DateTime(1996, 5, 14),
        gender: 'FEMALE',
        status: 'ACTIVE',
        objective: 'Descenso de grasa corporal y recomposición corporal',
        lastConsultationDate: DateTime(2026, 9, 25),
        ownerName: 'Dr. Jose Sojo',
        teamCount: 3,
      );
}
