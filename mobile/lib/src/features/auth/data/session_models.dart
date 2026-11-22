/// Session models, shaped after what the API actually returns.
///
/// `POST /api/auth/login` → `{ tokens: { access_token, refresh_token }, user }`
/// `GET /api/user/me` → `{ data: user }`
/// `GET /api/organizations/my-workspaces` → organization rows with `userRole`.
library;

class SessionUser {
  const SessionUser({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.fullName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? fullName;
  final String? avatarUrl;

  String get displayName {
    final full = fullName?.trim();
    if (full != null && full.isNotEmpty) return full;

    final parts = [firstName, lastName]
        .whereType<String>()
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return email;

    return parts.join(' ');
  }

  String get initials {
    final words = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first.substring(0, 1).toUpperCase();
    return '${words.first.substring(0, 1)}${words.last.substring(0, 1)}'
        .toUpperCase();
  }

  factory SessionUser.fromJson(Map<String, dynamic> json) => SessionUser(
        id: '${json['id']}',
        email: '${json['email'] ?? ''}',
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        fullName: json['fullName'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
      );
}

class Workspace {
  const Workspace({
    required this.id,
    required this.name,
    this.slug,
    this.role,
    this.subscriptionStatus,
  });

  final String id;
  final String name;
  final String? slug;
  final String? role;
  final String? subscriptionStatus;

  factory Workspace.fromJson(Map<String, dynamic> json) => Workspace(
        id: '${json['id']}',
        name: '${json['name'] ?? json['slug'] ?? 'Espacio'}',
        slug: json['slug'] as String?,
        role: json['userRole'] as String?,
        subscriptionStatus: json['subscriptionStatus'] as String?,
      );
}

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  factory AuthTokens.fromLoginResponse(Map<String, dynamic> json) {
    final tokens = json['tokens'];
    if (tokens is! Map) {
      throw const FormatException('La respuesta del login no trae tokens.');
    }
    final accessToken = tokens['access_token'];
    final refreshToken = tokens['refresh_token'];
    if (accessToken is! String || refreshToken is! String) {
      throw const FormatException('La respuesta del login no trae tokens.');
    }
    return AuthTokens(accessToken: accessToken, refreshToken: refreshToken);
  }
}

class LoginResult {
  const LoginResult({required this.tokens, required this.user});

  final AuthTokens tokens;
  final SessionUser user;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return LoginResult(
      tokens: AuthTokens.fromLoginResponse(json),
      user: SessionUser.fromJson(
        user is Map<String, dynamic> ? user : const {},
      ),
    );
  }
}
