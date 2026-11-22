import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import 'session_models.dart';

/// Auth endpoints. Both tokens travel in the `Authorization` header, so the app
/// never has to deal with cookies.
class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;

  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    return LoginResult.fromJson(data);
  }

  Future<SessionUser> me() async {
    final data = await _client.get<Map<String, dynamic>>('/api/user/me');
    final user = data['data'];
    if (user is! Map<String, dynamic>) {
      throw const ApiException('No se pudo leer tu perfil.');
    }
    return SessionUser.fromJson(user);
  }

  Future<List<Workspace>> myWorkspaces() async {
    final data = await _client.get<List<dynamic>>(
      '/api/organizations/my-workspaces',
    );
    return data
        .whereType<Map<String, dynamic>>()
        .map(Workspace.fromJson)
        .toList();
  }

  Future<void> logout() async {
    try {
      await _client.post<dynamic>('/api/auth/logout');
    } on ApiException {
      // A dead session is already logged out from the app's point of view.
    }
  }
}
