/// Pure login validation, kept out of the widget so it is unit-tested.
class LoginFormErrors {
  const LoginFormErrors({this.email, this.password});

  final String? email;
  final String? password;

  bool get isValid => email == null && password == null;
}

const String loginEmailRequired = 'Escribí tu correo.';
const String loginEmailInvalid = 'Ese correo no parece válido.';
const String loginPasswordRequired = 'Escribí tu contraseña.';
const String loginPasswordTooShort =
    'La contraseña necesita al menos 6 caracteres.';

LoginFormErrors validateLogin({
  required String email,
  required String password,
}) {
  final trimmed = email.trim();

  String? emailError;
  if (trimmed.isEmpty) {
    emailError = loginEmailRequired;
  } else if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(trimmed)) {
    emailError = loginEmailInvalid;
  }

  String? passwordError;
  if (password.isEmpty) {
    passwordError = loginPasswordRequired;
  } else if (password.length < 6) {
    passwordError = loginPasswordTooShort;
  }

  return LoginFormErrors(email: emailError, password: passwordError);
}
