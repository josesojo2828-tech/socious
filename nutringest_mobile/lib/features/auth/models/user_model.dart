class UserModel {
  final String id;
  final String email;
  final String name;
  final String? fullName;
  final String? role;
  final String? specialty;
  final String? license;
  final String? phone;
  final String? phoneNumber;
  final String? city;
  final List<String> entitlements;
  final List<String> userPermissions;
  final List<String> permitsList;
  final List<String> modules;
  final Map<String, dynamic>? permits;
  final List<dynamic>? subscriptions;
  final String? avatarUrl;
  final double walletBalance;
  final String subscriptionPlan;
  final String subscriptionExpiresAt;
  final double? officeLatitude;
  final double? officeLongitude;
  final String? officeAddress;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    this.fullName,
    this.role,
    this.specialty,
    this.license,
    this.phone,
    this.phoneNumber,
    this.city,
    this.entitlements = const [],
    this.userPermissions = const [],
    this.permitsList = const [],
    this.modules = const [],
    this.permits,
    this.subscriptions,
    this.avatarUrl,
    this.walletBalance = 0.0,
    this.subscriptionPlan = 'Premium',
    this.subscriptionExpiresAt = '30 Oct 2026',
    this.officeLatitude,
    this.officeLongitude,
    this.officeAddress,
  });

  /// Normalizes and checks if a permission/module key represents Institutional Food.
  /// Matches NestJS / WebApp entitlement definitions case-insensitively:
  /// INSTITUTIONAL_FOOD, INSTITUTIONAL_FOOD_ACCESS, INSTITUTIONAL_NUTRITION, INSTITUTIONAL, etc.
  static bool isInstitutionalFoodKey(String? rawKey) {
    if (rawKey == null) return false;
    final normalized = rawKey.trim().toUpperCase();
    return normalized == 'INSTITUTIONAL_FOOD' ||
        normalized == 'INSTITUTIONAL_FOOD_ACCESS' ||
        normalized == 'INSTITUTIONAL_NUTRITION' ||
        normalized == 'INSTITUTIONAL' ||
        normalized == 'INSTITUTIONAL_FOODS' ||
        normalized.contains('INSTITUTIONAL');
  }

  factory UserModel.fromJson(Map<String, dynamic> rawJson) {
    // Defensive unwrap if json is wrapped in { 'user': ... } or { 'data': ... }
    Map<String, dynamic> json = rawJson;
    if (json['user'] is Map) {
      json = Map<String, dynamic>.from(json['user'] as Map);
    } else if (json['data'] is Map && json['id'] == null && json['email'] == null) {
      json = Map<String, dynamic>.from(json['data'] as Map);
    }

    // Role resolution (from role, permits.name, or roleName)
    String? role = json['role']?.toString();
    Map<String, dynamic>? permitsMap;
    if (json['permits'] is Map) {
      permitsMap = Map<String, dynamic>.from(json['permits'] as Map);
    }
    if ((role == null || role.isEmpty) && permitsMap != null) {
      role = permitsMap['name']?.toString();
    }
    if (role == null || role.isEmpty) {
      role = json['roleName']?.toString();
    }

    // Name & Full Name resolution
    final String? parsedFullName = json['fullName']?.toString() ??
        json['full_name']?.toString() ??
        json['name']?.toString() ??
        ((json['firstName'] != null || json['lastName'] != null)
            ? '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim()
            : null);

    final String name = (parsedFullName != null && parsedFullName.trim().isNotEmpty)
        ? parsedFullName.trim()
        : (json['username']?.toString() ??
            json['email']?.toString() ??
            'Lic. Profesional');

    // Phone & Phone Number resolution from multiple JSON keys & nested profiles/addresses
    String? rawPhone = json['phone']?.toString() ??
        json['phoneNumber']?.toString() ??
        json['phone_number']?.toString() ??
        json['contactPhone']?.toString() ??
        json['contact_phone']?.toString() ??
        json['whatsapp']?.toString() ??
        json['mobile']?.toString() ??
        json['cellphone']?.toString();

    if ((rawPhone == null || rawPhone.trim().isEmpty) && json['profile'] is Map) {
      final prof = json['profile'] as Map;
      rawPhone = prof['phone']?.toString() ??
          prof['phoneNumber']?.toString() ??
          prof['phone_number']?.toString() ??
          prof['contactPhone']?.toString() ??
          prof['whatsapp']?.toString();
    }

    if ((rawPhone == null || rawPhone.trim().isEmpty) && json['nutritionistProfile'] is Map) {
      final nutProf = json['nutritionistProfile'] as Map;
      rawPhone = nutProf['phone']?.toString() ??
          nutProf['phoneNumber']?.toString() ??
          nutProf['phone_number']?.toString() ??
          nutProf['contactPhone']?.toString() ??
          nutProf['whatsapp']?.toString();
    }

    if ((rawPhone == null || rawPhone.trim().isEmpty) &&
        json['addresses'] is List &&
        (json['addresses'] as List).isNotEmpty) {
      for (final addr in json['addresses']) {
        if (addr is Map) {
          final p = addr['phone']?.toString() ?? addr['phoneNumber']?.toString();
          if (p != null && p.trim().isNotEmpty) {
            rawPhone = p;
            break;
          }
        }
      }
    }

    final parsedPhone = (rawPhone != null && rawPhone.trim().isNotEmpty) ? rawPhone.trim() : null;

    // Permits list resolution
    final List<String> parsedPermitsList = [];
    if (json['permitsList'] is List) {
      for (final item in json['permitsList']) {
        if (item != null) parsedPermitsList.add(item.toString());
      }
    } else if (permitsMap != null && permitsMap['list'] is List) {
      for (final item in permitsMap['list']) {
        if (item != null) parsedPermitsList.add(item.toString());
      }
    }

    // User permissions resolution
    final List<String> parsedUserPermissions = [];
    final rawUserPerms = json['userPermissions'];
    if (rawUserPerms is List) {
      for (final p in rawUserPerms) {
        if (p is String) {
          parsedUserPermissions.add(p);
        } else if (p is Map && p['permission'] != null) {
          final expiresAt = p['expiresAt'];
          if (expiresAt != null) {
            try {
              final exp = DateTime.parse(expiresAt.toString());
              if (exp.isBefore(DateTime.now())) continue;
            } catch (_) {}
          }
          parsedUserPermissions.add(p['permission'].toString());
        }
      }
    }

    // Entitlements and modules resolution
    final List<String> parsedEntitlements = [];
    final List<String> parsedModules = [];

    final rawEntitlements = json['entitlements'];
    if (rawEntitlements is List) {
      for (final e in rawEntitlements) {
        if (e is String) {
          parsedEntitlements.add(e);
        } else if (e is Map) {
          if (e['key'] != null) parsedEntitlements.add(e['key'].toString());
          if (e['name'] != null) parsedEntitlements.add(e['name'].toString());
          if (e['permission'] != null) parsedEntitlements.add(e['permission'].toString());
        }
      }
    } else if (rawEntitlements is Map) {
      if (rawEntitlements['permissions'] is List) {
        for (final p in rawEntitlements['permissions']) {
          if (p != null) parsedEntitlements.add(p.toString());
        }
      }
      if (rawEntitlements['modules'] is List) {
        for (final m in rawEntitlements['modules']) {
          if (m is String) {
            parsedModules.add(m);
          } else if (m is Map && m['key'] != null) {
            parsedModules.add(m['key'].toString());
          }
        }
      }
    }

    final rawModules = json['modules'];
    if (rawModules is List) {
      for (final m in rawModules) {
        if (m is String) {
          if (!parsedModules.contains(m)) parsedModules.add(m);
        } else if (m is Map && m['key'] != null) {
          final k = m['key'].toString();
          if (!parsedModules.contains(k)) parsedModules.add(k);
        }
      }
    }

    // Subscriptions resolution
    final rawSubs = json['subscriptions'];
    List<dynamic>? subscriptionsList;
    if (rawSubs is List) {
      subscriptionsList = rawSubs;
      for (final sub in rawSubs) {
        if (sub is Map) {
          final status = sub['status']?.toString().toUpperCase();
          if (status == 'ACTIVE') {
            final plan = sub['plan'];
            if (plan is Map) {
              final planName = plan['name']?.toString().toUpperCase() ?? '';
              final planContent = plan['content'];
              if (planContent is Map) {
                if (planContent['grants'] is List) {
                  for (final g in planContent['grants']) {
                    if (g != null && !parsedEntitlements.contains(g.toString())) {
                      parsedEntitlements.add(g.toString());
                    }
                  }
                }
                if (planContent['modules'] is List) {
                  for (final m in planContent['modules']) {
                    if (m != null && !parsedModules.contains(m.toString())) {
                      parsedModules.add(m.toString());
                    }
                  }
                }
              }
              if (planName.contains('PREMIUM') || planName.contains('CLINIC')) {
                if (!parsedEntitlements.contains('PREMIUM_ACCESS')) {
                  parsedEntitlements.add('PREMIUM_ACCESS');
                }
                if (!parsedEntitlements.contains('INSTITUTIONAL_FOOD_ACCESS')) {
                  parsedEntitlements.add('INSTITUTIONAL_FOOD_ACCESS');
                }
                if (!parsedModules.contains('INSTITUTIONAL_FOOD')) {
                  parsedModules.add('INSTITUTIONAL_FOOD');
                }
              }
            }
          }
        }
      }
    }

    if (json['isPremium'] == true || json['hasPremium'] == true) {
      if (!parsedEntitlements.contains('PREMIUM_ACCESS')) {
        parsedEntitlements.add('PREMIUM_ACCESS');
      }
    }

    final String? avatarUrl = json['avatarUrl']?.toString() ??
        json['avatar_url']?.toString() ??
        json['avatar']?.toString() ??
        json['photoUrl']?.toString() ??
        json['photo_url']?.toString() ??
        (json['nutritionistProfile'] is Map
            ? (json['nutritionistProfile']['photoUrl']?.toString() ??
                json['nutritionistProfile']['avatarUrl']?.toString())
            : null);

    double walletBalance = 0.0;
    if (json['wallet'] is Map) {
      walletBalance = ((json['wallet']['balance'] ?? json['wallet']['amount'] ?? 0.0) as num).toDouble();
    } else if (json['wallet'] is num) {
      walletBalance = (json['wallet'] as num).toDouble();
    } else if (json['walletBalance'] is num) {
      walletBalance = (json['walletBalance'] as num).toDouble();
    }

    String subscriptionPlan = 'Premium';
    String subscriptionExpiresAt = '30 Oct 2026';
    if (subscriptionsList != null && subscriptionsList.isNotEmpty) {
      final firstSub = subscriptionsList.first;
      if (firstSub is Map) {
        if (firstSub['plan'] is Map && firstSub['plan']['name'] != null) {
          subscriptionPlan = firstSub['plan']['name'].toString();
        } else if (firstSub['name'] != null) {
          subscriptionPlan = firstSub['name'].toString();
        }
        final expStr = (firstSub['expiresAt'] ?? firstSub['validUntil'] ?? firstSub['endDate'])?.toString();
        if (expStr != null) {
          try {
            final dt = DateTime.parse(expStr);
            final months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            final mStr = (dt.month >= 1 && dt.month <= 12) ? months[dt.month - 1] : '';
            subscriptionExpiresAt = '${dt.day} $mStr ${dt.year}';
          } catch (_) {
            subscriptionExpiresAt = expStr;
          }
        }
      }
    } else if (json['subscriptionPlan'] != null) {
      subscriptionPlan = json['subscriptionPlan'].toString();
    }

    double? officeLat;
    double? officeLng;
    String? officeAddr;
    final officeLoc = json['officeLocation'] ?? json['location'] ?? (json['nutritionistProfile'] is Map ? json['nutritionistProfile']['location'] : null);
    if (officeLoc is Map) {
      officeLat = (officeLoc['latitude'] ?? officeLoc['lat']) != null ? ((officeLoc['latitude'] ?? officeLoc['lat']) as num).toDouble() : null;
      officeLng = (officeLoc['longitude'] ?? officeLoc['lng'] ?? officeLoc['long']) != null ? ((officeLoc['longitude'] ?? officeLoc['lng'] ?? officeLoc['long']) as num).toDouble() : null;
      officeAddr = officeLoc['address']?.toString();
    }
    officeLat ??= (json['officeLatitude'] ?? json['latitude'] as num?)?.toDouble();
    officeLng ??= (json['officeLongitude'] ?? json['longitude'] as num?)?.toDouble();
    officeAddr ??= json['officeAddress']?.toString() ?? json['address']?.toString();

    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      name: name,
      fullName: parsedFullName ?? name,
      role: role,
      specialty: json['specialty']?.toString() ?? 'Nutrición Clínica y Deportiva',
      license: json['license']?.toString() ?? 'MP 4521 · MN 8823',
      phone: parsedPhone,
      phoneNumber: parsedPhone,
      city: json['city']?.toString() ?? 'Buenos Aires, Argentina',
      entitlements: parsedEntitlements,
      userPermissions: parsedUserPermissions,
      permitsList: parsedPermitsList,
      modules: parsedModules,
      permits: permitsMap,
      subscriptions: subscriptionsList,
      avatarUrl: avatarUrl,
      walletBalance: walletBalance,
      subscriptionPlan: subscriptionPlan,
      subscriptionExpiresAt: subscriptionExpiresAt,
      officeLatitude: officeLat,
      officeLongitude: officeLng,
      officeAddress: officeAddr,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'fullName': fullName ?? name,
      'role': role,
      'specialty': specialty,
      'license': license,
      'phone': phone,
      'phoneNumber': phoneNumber ?? phone,
      'city': city,
      'entitlements': entitlements,
      'userPermissions': userPermissions,
      'permitsList': permitsList,
      'modules': modules,
      'permits': permits,
      'subscriptions': subscriptions,
      'avatarUrl': avatarUrl,
      'walletBalance': walletBalance,
      'subscriptionPlan': subscriptionPlan,
      'subscriptionExpiresAt': subscriptionExpiresAt,
      'officeLatitude': officeLatitude,
      'officeLongitude': officeLongitude,
      'officeAddress': officeAddress,
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? fullName,
    String? role,
    String? specialty,
    String? license,
    String? phone,
    String? phoneNumber,
    String? city,
    List<String>? entitlements,
    List<String>? userPermissions,
    List<String>? permitsList,
    List<String>? modules,
    Map<String, dynamic>? permits,
    List<dynamic>? subscriptions,
    String? avatarUrl,
    double? walletBalance,
    String? subscriptionPlan,
    String? subscriptionExpiresAt,
    double? officeLatitude,
    double? officeLongitude,
    String? officeAddress,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
      specialty: specialty ?? this.specialty,
      license: license ?? this.license,
      phone: phone ?? this.phone,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      city: city ?? this.city,
      entitlements: entitlements ?? this.entitlements,
      userPermissions: userPermissions ?? this.userPermissions,
      permitsList: permitsList ?? this.permitsList,
      modules: modules ?? this.modules,
      permits: permits ?? this.permits,
      subscriptions: subscriptions ?? this.subscriptions,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      walletBalance: walletBalance ?? this.walletBalance,
      subscriptionPlan: subscriptionPlan ?? this.subscriptionPlan,
      subscriptionExpiresAt: subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      officeLatitude: officeLatitude ?? this.officeLatitude,
      officeLongitude: officeLongitude ?? this.officeLongitude,
      officeAddress: officeAddress ?? this.officeAddress,
    );
  }

  bool get isAdmin {
    final r = role?.trim().toUpperCase();
    if (r == 'ADMIN' || r == 'SUPERADMIN') return true;
    final permitName = permits?['name']?.toString().trim().toUpperCase();
    return permitName == 'ADMIN' || permitName == 'SUPERADMIN';
  }

  bool get isPrivileged {
    if (isAdmin) return true;
    final r = role?.trim().toUpperCase();
    if (r == 'CLINIC_ADMIN' || r == 'CLINIC_STAFF') return true;
    final permitName = permits?['name']?.toString().trim().toUpperCase();
    return permitName == 'CLINIC_ADMIN' || permitName == 'CLINIC_STAFF';
  }

  bool get hasPremiumAccess {
    if (isAdmin || isPrivileged) return true;
    final r = role?.trim().toUpperCase();
    if (r == 'PREMIUM_ACCESS' ||
        r == 'PREMIUM' ||
        r == 'NUTRITIONIST_PREMIUM' ||
        r == 'PRO' ||
        r == 'PRO_ACCESS' ||
        r == 'CLINICA' ||
        r == 'INSTITUTIONAL_FOOD') {
      return true;
    }
    return hasEntitlement('PREMIUM_ACCESS') ||
        hasEntitlement('PREMIUM') ||
        hasPermission('PREMIUM_ACCESS');
  }

  bool hasEntitlement(String key) {
    if (isAdmin) return true;
    final target = key.trim().toUpperCase();
    final isTargetInst = isInstitutionalFoodKey(target);

    if (isTargetInst && (isAdmin || hasPremiumAccess)) return true;

    for (final e in entitlements) {
      final normalized = e.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    for (final m in modules) {
      final normalized = m.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    for (final p in userPermissions) {
      final normalized = p.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    for (final p in permitsList) {
      final normalized = p.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    return false;
  }

  bool hasPermission(String permission) {
    if (isAdmin) return true;
    final target = permission.trim().toUpperCase();
    final isTargetInst = isInstitutionalFoodKey(target);

    if (isTargetInst && (isAdmin || hasPremiumAccess)) return true;

    for (final p in permitsList) {
      final normalized = p.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    for (final p in userPermissions) {
      final normalized = p.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    for (final e in entitlements) {
      final normalized = e.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    return false;
  }

  bool canAccessModule(String moduleKey) {
    if (isAdmin) return true;
    final target = moduleKey.trim().toUpperCase();
    final isTargetInst = isInstitutionalFoodKey(target);

    if (isTargetInst && (isAdmin || hasPremiumAccess)) return true;

    for (final m in modules) {
      final normalized = m.trim().toUpperCase();
      if (normalized == target) return true;
      if (isTargetInst && isInstitutionalFoodKey(normalized)) return true;
    }
    return hasEntitlement(moduleKey);
  }

  bool get hasInstitutionalFoodAccess {
    if (isAdmin || isPrivileged || hasPremiumAccess) return true;
    if (isInstitutionalFoodKey(role)) return true;
    if (hasEntitlement('INSTITUTIONAL_FOOD')) return true;
    if (hasEntitlement('INSTITUTIONAL_FOOD_ACCESS')) return true;
    if (hasEntitlement('INSTITUTIONAL_NUTRITION')) return true;
    if (hasPermission('INSTITUTIONAL_FOOD_ACCESS')) return true;
    if (hasPermission('INSTITUTIONAL_FOOD')) return true;
    if (canAccessModule('INSTITUTIONAL_FOOD')) return true;
    return false;
  }

  bool get hasTeamAccess => hasPremiumAccess;

  String get initials {
    final displayName = (fullName != null && fullName!.trim().isNotEmpty)
        ? fullName!.trim()
        : name;
    if (displayName.isEmpty) return 'N';
    final parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      final first = parts[0].replaceAll(RegExp(r'[^a-zA-Z]'), '');
      final second = parts[1].replaceAll(RegExp(r'[^a-zA-Z]'), '');
      if (first.isNotEmpty && second.isNotEmpty) {
        return '${first[0]}${second[0]}'.toUpperCase();
      }
    }
    final clean = displayName.replaceAll(RegExp(r'[^a-zA-Z]'), '');
    if (clean.length >= 2) return clean.substring(0, 2).toUpperCase();
    if (clean.isNotEmpty) return clean[0].toUpperCase();
    return 'N';
  }
}
