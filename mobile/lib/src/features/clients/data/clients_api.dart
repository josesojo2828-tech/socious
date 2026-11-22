import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/api/paged.dart';

class ClientSummary {
  const ClientSummary({
    required this.id,
    required this.name,
    this.taxId,
    this.phone,
    this.email,
    this.city,
    this.balanceUSD = 0,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? taxId;
  final String? phone;
  final String? email;
  final String? city;
  final double balanceUSD;
  final bool isActive;

  factory ClientSummary.fromJson(Map<String, dynamic> json) => ClientSummary(
        id: '${json['id']}',
        name: '${json['name'] ?? 'Sin nombre'}',
        taxId: json['taxId'] as String?,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        city: json['city'] as String?,
        balanceUSD: toDouble(json['currentBalanceUSD']),
        isActive: json['isActive'] != false,
      );
}

class ClientDraft {
  const ClientDraft({
    required this.name,
    this.taxId,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.creditLimitUSD,
  });

  final String name;
  final String? taxId;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final double? creditLimitUSD;

  Map<String, dynamic> toJson() => {
        'name': name.trim(),
        if (_filled(taxId)) 'taxId': taxId!.trim(),
        if (_filled(phone)) 'phone': phone!.trim(),
        if (_filled(email)) 'email': email!.trim(),
        if (_filled(address)) 'address': address!.trim(),
        if (_filled(city)) 'city': city!.trim(),
        if (creditLimitUSD != null) 'creditLimitUSD': creditLimitUSD,
      };

  static bool _filled(String? value) =>
      value != null && value.trim().isNotEmpty;
}

class ClientsApi {
  ClientsApi(this._client);

  final ApiClient _client;

  Future<Paged<ClientSummary>> search({
    String? q,
    int page = 1,
    int limit = 30,
  }) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/clients',
      query: {
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'page': page,
        'limit': limit,
      },
    );
    return Paged.parse(data, ClientSummary.fromJson);
  }

  Future<ClientSummary> create(ClientDraft draft) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/clients',
      body: draft.toJson(),
    );
    final payload = data['data'];
    return ClientSummary.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }
}

final clientsApiProvider = Provider<ClientsApi>((ref) {
  return ClientsApi(ref.watch(apiClientProvider));
});

final clientsProvider = FutureProvider.autoDispose
    .family<Paged<ClientSummary>, String>((ref, query) {
  return ref.watch(clientsApiProvider).search(q: query);
});
