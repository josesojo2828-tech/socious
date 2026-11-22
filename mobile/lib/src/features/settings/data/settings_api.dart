import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';

/// The subset of tenant settings the phone can change today.
///
/// Every field has a safe default: an older backend that does not send a key
/// must not crash the screen.
class TenantSettingsView {
  const TenantSettingsView({
    this.shiftControl = true,
    this.showUSD = true,
    this.showVES = true,
    this.showUSDT = false,
    this.useRawMaterials = false,
    this.useServices = true,
  });

  final bool shiftControl;
  final bool showUSD;
  final bool showVES;
  final bool showUSDT;
  final bool useRawMaterials;
  final bool useServices;

  factory TenantSettingsView.fromJson(Map<String, dynamic> json) {
    final cash = _map(json['cash']);
    final currencies = _map(json['currencies']);
    final inventory = _map(json['inventory']);

    return TenantSettingsView(
      shiftControl: _bool(cash['shiftControl'], fallback: true),
      showUSD: _bool(currencies['showUSD'], fallback: true),
      showVES: _bool(currencies['showVES'], fallback: true),
      showUSDT: _bool(currencies['showUSDT'], fallback: false),
      useRawMaterials: _bool(inventory['useRawMaterials'], fallback: false),
      useServices: _bool(inventory['useServices'], fallback: true),
    );
  }

  static Map<String, dynamic> _map(dynamic value) =>
      value is Map<String, dynamic> ? value : const {};

  static bool _bool(dynamic value, {required bool fallback}) =>
      value is bool ? value : fallback;
}

class SettingsApi {
  SettingsApi(this._client);

  final ApiClient _client;

  Future<TenantSettingsView> get() async {
    final data = await _client.get<Map<String, dynamic>>('/api/settings');
    final payload = data['data'];
    return TenantSettingsView.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }

  Future<void> update(Map<String, dynamic> patch) async {
    await _client.patch<dynamic>('/api/settings', body: patch);
  }
}

final settingsApiProvider = Provider<SettingsApi>((ref) {
  return SettingsApi(ref.watch(apiClientProvider));
});

final tenantSettingsProvider =
    FutureProvider.autoDispose<TenantSettingsView>((ref) {
  return ref.watch(settingsApiProvider).get();
});
