import 'package:flutter_test/flutter_test.dart';
import 'package:socius_mobile/src/features/auth/data/session_models.dart';

void main() {
  group('SessionUser', () {
    test('prefers the full name', () {
      final user = SessionUser.fromJson({
        'id': 'u-1',
        'email': 'ana@socius.test',
        'firstName': 'Ana',
        'lastName': 'Pérez',
        'fullName': 'Ana María Pérez',
      });

      expect(user.displayName, 'Ana María Pérez');
      expect(user.initials, 'AP');
    });

    test('joins first and last name when there is no full name', () {
      final user = SessionUser.fromJson({
        'id': 'u-1',
        'email': 'ana@socius.test',
        'firstName': 'Ana',
        'lastName': 'Pérez',
      });

      expect(user.displayName, 'Ana Pérez');
    });

    test('falls back to the email', () {
      final user = SessionUser.fromJson({
        'id': 'u-1',
        'email': 'ana@socius.test',
      });

      expect(user.displayName, 'ana@socius.test');
      expect(user.initials, 'A');
    });
  });

  group('Workspace', () {
    test('reads the role the API calls userRole', () {
      final workspace = Workspace.fromJson({
        'id': 'org-1',
        'name': 'Bodega Central',
        'slug': 'bodega-central',
        'userRole': 'ADMIN',
        'subscriptionStatus': 'ACTIVE',
      });

      expect(workspace.name, 'Bodega Central');
      expect(workspace.role, 'ADMIN');
      expect(workspace.subscriptionStatus, 'ACTIVE');
    });
  });

  group('AuthTokens', () {
    test('reads the login envelope', () {
      final result = LoginResult.fromJson({
        'tokens': {
          'access_token': 'at',
          'refresh_token': 'rt',
        },
        'user': {'id': 'u-1', 'email': 'ana@socius.test'},
      });

      expect(result.tokens.accessToken, 'at');
      expect(result.tokens.refreshToken, 'rt');
      expect(result.user.email, 'ana@socius.test');
    });

    test('rejects a login envelope without tokens', () {
      expect(
        () => LoginResult.fromJson({'user': {'id': 'u-1'}}),
        throwsA(isA<FormatException>()),
      );
    });
  });
}
