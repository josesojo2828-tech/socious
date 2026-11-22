import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_providers.dart';
import '../api/api_exception.dart';

class RatesSnapshot {
  const RatesSnapshot({
    required this.rateBcv,
    required this.rateUsdt,
    this.date,
  });

  final double rateBcv;
  final double rateUsdt;
  final DateTime? date;

  factory RatesSnapshot.fromJson(Map<String, dynamic> json) {
    return RatesSnapshot(
      rateBcv: _toDouble(json['rateBcv']),
      rateUsdt: _toDouble(json['rateUsdt']),
      date: DateTime.tryParse('${json['date'] ?? ''}'),
    );
  }

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('${value ?? ''}') ?? 0;
  }
}

class RatesApi {
  RatesApi(this._client);

  final ApiClient _client;

  Future<RatesSnapshot> latest() async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/exchange/rates/latest',
    );
    return RatesSnapshot.fromJson(data);
  }
}

final ratesApiProvider = Provider<RatesApi>((ref) {
  return RatesApi(ref.watch(apiClientProvider));
});

final ratesProvider = FutureProvider.autoDispose<RatesSnapshot>((ref) {
  return ref.watch(ratesApiProvider).latest();
});

/// Kept for callers that want the error text without handling Dio.
String apiErrorMessage(Object error) =>
    error is ApiException ? error.message : '$error';
