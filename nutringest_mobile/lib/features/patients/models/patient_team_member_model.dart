class PatientTeamMemberModel {
  final String id;
  final String patientId;
  final String nutritionistId;
  final String role; // 'PRIMARY' | 'SUPPORT'
  final bool isActive;
  final DateTime? assignedAt;

  final String? nutritionistLicenseCode;
  final String? nutritionistSpecialty;
  final String? nutritionistUserId;
  final String? firstName;
  final String? lastName;
  final String? username;
  final String? email;
  final String? phone;

  PatientTeamMemberModel({
    required this.id,
    required this.patientId,
    required this.nutritionistId,
    required this.role,
    required this.isActive,
    this.assignedAt,
    this.nutritionistLicenseCode,
    this.nutritionistSpecialty,
    this.nutritionistUserId,
    this.firstName,
    this.lastName,
    this.username,
    this.email,
    this.phone,
  });

  bool get isPrimary => role.toUpperCase() == 'PRIMARY';

  String get fullName {
    final fn = firstName?.trim() ?? '';
    final ln = lastName?.trim() ?? '';
    final combined = '$fn $ln'.trim();
    if (combined.isNotEmpty) return combined;
    if (username != null && username!.trim().isNotEmpty) return username!.trim();
    if (email != null && email!.trim().isNotEmpty) return email!.trim();
    if (nutritionistLicenseCode != null && nutritionistLicenseCode!.isNotEmpty) {
      return 'Lic. $nutritionistLicenseCode';
    }
    return 'Profesional de Cuidado';
  }

  String get initials {
    final name = fullName;
    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'P';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  String get displayRole {
    if (isPrimary) return 'Nutricionista Principal';
    if (nutritionistSpecialty != null && nutritionistSpecialty!.trim().isNotEmpty) {
      return nutritionistSpecialty!;
    }
    return 'Colaborador de Cuidado';
  }

  String get whatsappUrl {
    if (phone == null || phone!.trim().isEmpty) return '';
    final cleanPhone = phone!.replaceAll(RegExp(r'[^\d+]'), '');
    return 'https://wa.me/$cleanPhone';
  }

  factory PatientTeamMemberModel.fromJson(Map<String, dynamic> json) {
    final nut = json['nutritionist'] is Map<String, dynamic>
        ? json['nutritionist'] as Map<String, dynamic>
        : <String, dynamic>{};
    final usr = nut['user'] is Map<String, dynamic>
        ? nut['user'] as Map<String, dynamic>
        : <String, dynamic>{};

    return PatientTeamMemberModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      nutritionistId: json['nutritionistId']?.toString() ?? nut['id']?.toString() ?? '',
      role: json['role']?.toString().toUpperCase() ?? 'SUPPORT',
      isActive: json['isActive'] == true || json['status'] == 'ACTIVE',
      assignedAt: json['assignedAt'] != null ? DateTime.tryParse(json['assignedAt'].toString()) : null,
      nutritionistLicenseCode: nut['licenseCode']?.toString(),
      nutritionistSpecialty: nut['specialty']?.toString(),
      nutritionistUserId: usr['id']?.toString(),
      firstName: usr['firstName']?.toString(),
      lastName: usr['lastName']?.toString(),
      username: usr['username']?.toString(),
      email: usr['email']?.toString(),
      phone: usr['phone']?.toString() ?? usr['phoneNumber']?.toString() ?? usr['whatsapp']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'patientId': patientId,
        'nutritionistId': nutritionistId,
        'role': role,
        'isActive': isActive,
        'assignedAt': assignedAt?.toIso8601String(),
        'nutritionist': {
          'id': nutritionistId,
          'licenseCode': nutritionistLicenseCode,
          'specialty': nutritionistSpecialty,
          'user': {
            'id': nutritionistUserId,
            'firstName': firstName,
            'lastName': lastName,
            'username': username,
            'email': email,
            'phone': phone,
          }
        }
      };
}

class CollaboratorSearchResultModel {
  final String id;
  final String fullName;
  final String email;
  final String? specialty;

  CollaboratorSearchResultModel({
    required this.id,
    required this.fullName,
    required this.email,
    this.specialty,
  });

  factory CollaboratorSearchResultModel.fromJson(Map<String, dynamic> json) {
    return CollaboratorSearchResultModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['name']?.toString() ?? json['email']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      specialty: json['specialty']?.toString(),
    );
  }
}
