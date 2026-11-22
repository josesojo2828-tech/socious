import 'api_host.dart';

/// App-wide configuration.
///
/// The base URL resolves in this order:
/// 1. `--dart-define=API_BASE_URL=http://192.168.1.10:3001` (CI / builds);
/// 2. [ApiHost.baseUrl], the file you edit for local work.
class AppConfig {
  const AppConfig._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl =>
      _override.isNotEmpty ? _override : ApiHost.baseUrl;

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 20);
}
