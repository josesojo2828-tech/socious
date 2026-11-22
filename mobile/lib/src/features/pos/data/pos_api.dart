import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';

class PaymentOption {
  const PaymentOption({
    required this.code,
    required this.label,
    required this.currency,
  });

  final String code;
  final String label;
  final String currency;

  factory PaymentOption.fromJson(Map<String, dynamic> json) => PaymentOption(
        code: '${json['code']}',
        label: '${json['label'] ?? json['code']}',
        currency: '${json['currency'] ?? 'USD'}',
      );
}

class PosApi {
  PosApi(this._client);

  final ApiClient _client;

  /// Business methods (built-in catalog + the tenant's own), already filtered
  /// by the settings switches.
  Future<List<PaymentOption>> paymentOptions() async {
    final data = await _client.get<List<dynamic>>(
      '/api/tenant-payment-methods/pos-options',
    );
    return data
        .whereType<Map<String, dynamic>>()
        .map(PaymentOption.fromJson)
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> createSale(Map<String, dynamic> body) {
    return _client.post<Map<String, dynamic>>('/api/sales', body: body);
  }
}

final posApiProvider = Provider<PosApi>((ref) {
  return PosApi(ref.watch(apiClientProvider));
});

final paymentOptionsProvider =
    FutureProvider.autoDispose<List<PaymentOption>>((ref) {
  return ref.watch(posApiProvider).paymentOptions();
});
