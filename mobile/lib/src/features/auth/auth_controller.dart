import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/storage/token_storage.dart';
import 'data/auth_api.dart';
import 'data/session_models.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.workspaces = const [],
    this.workspaceId,
    this.submitting = false,
    this.error,
  });

  final AuthStatus status;
  final SessionUser? user;
  final List<Workspace> workspaces;
  final String? workspaceId;
  final bool submitting;
  final String? error;

  Workspace? get activeWorkspace {
    for (final workspace in workspaces) {
      if (workspace.id == workspaceId) return workspace;
    }
    return null;
  }

  AuthState copyWith({
    AuthStatus? status,
    SessionUser? user,
    List<Workspace>? workspaces,
    String? workspaceId,
    bool? submitting,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      workspaces: workspaces ?? this.workspaces,
      workspaceId: workspaceId ?? this.workspaceId,
      submitting: submitting ?? this.submitting,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(storage: ref.watch(tokenStorageProvider));
});

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(apiClientProvider));
});

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  TokenStorage get _storage => ref.read(tokenStorageProvider);
  AuthApi get _api => ref.read(authApiProvider);

  @override
  AuthState build() => const AuthState(status: AuthStatus.unknown);

  /// Runs once at launch: a stored access token is validated against the API,
  /// not trusted blindly.
  Future<void> bootstrap() async {
    final token = await _storage.readAccessToken();
    if (token == null || token.isEmpty) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final user = await _api.me();
      final workspaces = await _api.myWorkspaces();
      final workspaceId = await _resolveWorkspaceId(workspaces);
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        workspaces: workspaces,
        workspaceId: workspaceId,
      );
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await _storage.clear();
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: error.message,
      );
    }
  }

  Future<bool> signIn({required String email, required String password}) async {
    state = state.copyWith(submitting: true, clearError: true);

    try {
      final result = await _api.login(email: email, password: password);
      await _storage.writeTokens(
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      );

      final workspaces = await _api.myWorkspaces();
      final workspaceId = await _resolveWorkspaceId(workspaces);

      state = AuthState(
        status: AuthStatus.authenticated,
        user: result.user,
        workspaces: workspaces,
        workspaceId: workspaceId,
      );
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(submitting: false, error: error.message);
      return false;
    } on FormatException catch (error) {
      state = state.copyWith(submitting: false, error: error.message);
      return false;
    }
  }

  Future<void> selectWorkspace(String workspaceId) async {
    await _storage.writeWorkspaceId(workspaceId);
    state = state.copyWith(workspaceId: workspaceId);
  }

  Future<void> signOut() async {
    await _api.logout();
    await _storage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<String?> _resolveWorkspaceId(List<Workspace> workspaces) async {
    final saved = await _storage.readWorkspaceId();
    for (final workspace in workspaces) {
      if (workspace.id == saved) return saved;
    }

    final first = workspaces.isEmpty ? null : workspaces.first.id;
    if (first != null) await _storage.writeWorkspaceId(first);
    return first;
  }
}
