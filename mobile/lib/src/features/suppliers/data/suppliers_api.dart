import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/api/paged.dart';

class SupplierSummary {
  const SupplierSummary({
    required this.id,
    required this.name,
    this.taxId,
    this.contactName,
    this.phone,
    this.email,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? taxId;
  final String? contactName;
  final String? phone;
  final String? email;
  final bool isActive;

  factory SupplierSummary.fromJson(Map<String, dynamic> json) =>
      SupplierSummary(
        id: '${json['id']}',
        name: '${json['name'] ?? 'Sin nombre'}',
        taxId: json['taxId'] as String?,
        contactName: json['contactName'] as String?,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        isActive: json['isActive'] != false,
      );
}

class SupplierDraft {
  const SupplierDraft({
    required this.name,
    this.taxId,
    this.contactName,
    this.phone,
    this.email,
    this.address,
    this.notes,
  });

  final String name;
  final String? taxId;
  final String? contactName;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;

  Map<String, dynamic> toJson() => {
        'name': name.trim(),
        if (_filled(taxId)) 'taxId': taxId!.trim(),
        if (_filled(contactName)) 'contactName': contactName!.trim(),
        if (_filled(phone)) 'phone': phone!.trim(),
        if (_filled(email)) 'email': email!.trim(),
        if (_filled(address)) 'address': address!.trim(),
        if (_filled(notes)) 'notes': notes!.trim(),
      };

  static bool _filled(String? value) =>
      value != null && value.trim().isNotEmpty;
}

class SuppliersApi {
  SuppliersApi(this._client);

  final ApiClient _client;

  Future<Paged<SupplierSummary>> search({
    String? q,
    int page = 1,
    int limit = 30,
  }) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/suppliers',
      query: {
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'page': page,
        'limit': limit,
      },
    );
    return Paged.parse(data, SupplierSummary.fromJson);
  }

  Future<SupplierSummary> create(SupplierDraft draft) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/suppliers',
      body: draft.toJson(),
    );
    final payload = data['data'];
    return SupplierSummary.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }
}

final suppliersApiProvider = Provider<SuppliersApi>((ref) {
  return SuppliersApi(ref.watch(apiClientProvider));
});

final suppliersProvider = FutureProvider.autoDispose
    .family<Paged<SupplierSummary>, String>((ref, query) {
  return ref.watch(suppliersApiProvider).search(q: query);
});
