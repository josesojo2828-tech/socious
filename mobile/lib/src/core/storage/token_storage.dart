import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the session outside the app sandbox in plain files.
///
/// Tokens live in the platform keystore (Keychain / EncryptedSharedPreferences),
/// never in SharedPreferences.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _accessKey = 'socius.access_token';
  static const String _refreshKey = 'socius.refresh_token';
  static const String _workspaceKey = 'socius.workspace_id';

  final FlutterSecureStorage _storage;

  Future<String?> readAccessToken() => _storage.read(key: _accessKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  Future<String?> readWorkspaceId() => _storage.read(key: _workspaceKey);

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> writeWorkspaceId(String workspaceId) =>
      _storage.write(key: _workspaceKey, value: workspaceId);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _workspaceKey);
  }
}
