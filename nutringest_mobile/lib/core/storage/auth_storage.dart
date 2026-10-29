import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthStorage {
  static const _storage = FlutterSecureStorage();

  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserData = 'user_data';
  static const _keyActiveWorkspace = 'active_workspace';
  static const _keyEnablePediatrics = 'enable_pediatrics';
  static const _keyEnableSportsNutrition = 'enable_sports_nutrition';
  static const _keyOnboardingCompleted = 'onboarding_completed';

  /// Convierte y guarda tokens de acceso y refresco.
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  /// Retorna el Access Token guardado.
  Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  /// Retorna el Refresh Token guardado.
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  /// Guarda el workspace activo.
  Future<void> saveActiveWorkspace(String workspaceId) async {
    await _storage.write(key: _keyActiveWorkspace, value: workspaceId);
  }

  /// Retorna el workspace activo guardado.
  Future<String?> getActiveWorkspace() async {
    return await _storage.read(key: _keyActiveWorkspace);
  }

  /// Retorna si existe un Access Token.
  Future<bool> hasValidToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Guarda los datos del usuario autenticado en formato JSON.
  Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _storage.write(key: _keyUserData, value: jsonEncode(userData));
  }

  /// Retorna los datos del usuario en Map.
  Future<Map<String, dynamic>?> getUserData() async {
    final raw = await _storage.read(key: _keyUserData);
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Guarda la preferencia de Nutrición Pediátrica.
  Future<void> saveEnablePediatrics(bool enabled) async {
    await _storage.write(key: _keyEnablePediatrics, value: enabled.toString());
  }

  /// Retorna si Nutrición Pediátrica está habilitada (default true).
  Future<bool> getEnablePediatrics() async {
    final val = await _storage.read(key: _keyEnablePediatrics);
    if (val == null) return true;
    return val == 'true';
  }

  /// Guarda la preferencia de Nutrición Deportiva.
  Future<void> saveEnableSportsNutrition(bool enabled) async {
    await _storage.write(key: _keyEnableSportsNutrition, value: enabled.toString());
  }

  /// Retorna si Nutrición Deportiva está habilitada (default true).
  Future<bool> getEnableSportsNutrition() async {
    final val = await _storage.read(key: _keyEnableSportsNutrition);
    if (val == null) return true;
    return val == 'true';
  }

  /// Guarda el estado de finalización del onboarding inicial.
  Future<void> setOnboardingCompleted([bool completed = true]) async {
    await _storage.write(
      key: _keyOnboardingCompleted,
      value: completed.toString(),
    );
  }

  /// Retorna si el onboarding fue completado o saltado (default false).
  Future<bool> isOnboardingCompleted() async {
    final val = await _storage.read(key: _keyOnboardingCompleted);
    return val == 'true';
  }

  /// Elimina los tokens y datos de sesión al cerrar sesión.
  Future<void> clearTokens() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyUserData);
    await _storage.delete(key: _keyActiveWorkspace);
    await _storage.delete(key: _keyEnablePediatrics);
    await _storage.delete(key: _keyEnableSportsNutrition);
  }
}
