import 'package:flutter_test/flutter_test.dart';
import 'package:socius_mobile/src/features/auth/login_form.dart';

void main() {
  group('validateLogin', () {
    test('accepts a complete credential pair', () {
      final errors = validateLogin(
        email: 'duena@socius.test',
        password: 'secreto123',
      );
      expect(errors.isValid, isTrue);
    });

    test('requires the email', () {
      final errors = validateLogin(email: '   ', password: 'secreto123');
      expect(errors.email, loginEmailRequired);
      expect(errors.isValid, isFalse);
    });

    test('rejects an email without a domain', () {
      final errors = validateLogin(email: 'duena@', password: 'secreto123');
      expect(errors.email, loginEmailInvalid);
    });

    test('requires the password', () {
      final errors = validateLogin(email: 'duena@socius.test', password: '');
      expect(errors.password, loginPasswordRequired);
    });

    test('rejects a short password', () {
      final errors = validateLogin(email: 'duena@socius.test', password: '123');
      expect(errors.password, loginPasswordTooShort);
    });
  });
}
