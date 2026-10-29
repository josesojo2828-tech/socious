import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import '../storage/auth_storage.dart';

class ApiClient {
  static const String defaultLocalBaseUrl = 'https://backend-nutrigest.ramirezicode.com.ve/api';
  static const String prodBaseUrl = 'https://backend-nutrigest.ramirezicode.com.ve/api';

  /// Permite especificar una URL base personalizada mediante --dart-define=API_BASE_URL=... o --dart-define=BASE_URL=...
  static const String customBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: String.fromEnvironment('BASE_URL', defaultValue: ''),
  );

  /// Por defecto se desactiva el entorno local (false) apuntando a producción
  static bool isLocal = const bool.fromEnvironment('IS_LOCAL', defaultValue: false);

  late final Dio dio;
  final AuthStorage authStorage;

  static String get baseUrl {
    if (customBaseUrl.isNotEmpty) {
      return customBaseUrl;
    }
    if (isLocal) {
      return defaultLocalBaseUrl;
    }
    return prodBaseUrl;
  }

  ApiClient({AuthStorage? storage}) : authStorage = storage ?? AuthStorage() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-workspace-id': 'personal',
        },
      ),
    );

    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => debugPrint('[API_CLIENT] $obj'),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          debugPrint('[API_CLIENT] [REQ] ${options.method} ${options.uri}');
          final token = await authStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          final activeWorkspace = await authStorage.getActiveWorkspace();
          options.headers['x-workspace-id'] =
              (activeWorkspace != null && activeWorkspace.isNotEmpty) ? activeWorkspace : 'personal';
          return handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint('[API_CLIENT] [RES] ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException err, handler) async {
          debugPrint('[API_CLIENT] [ERR] ${err.response?.statusCode} ${err.requestOptions.uri} - ${err.message}');
          if (err.response?.statusCode == 401 &&
              !err.requestOptions.path.contains('/auth/login') &&
              !err.requestOptions.path.contains('/auth/refresh')) {
            final isRefreshed = await _refreshToken();
            if (isRefreshed) {
              try {
                final newToken = await authStorage.getAccessToken();
                final opts = err.requestOptions;
                opts.headers['Authorization'] = 'Bearer $newToken';
                final response = await dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(err);
              }
            } else {
              await authStorage.clearTokens();
            }
          }
          return handler.next(err);
        },
      ),
    );
  }

  /// Extrae y normaliza de forma segura una lista de mapas [Map<String, dynamic>]
  /// a partir de diversas estructuras devueltas por el backend:
  /// - `List` directa
  /// - Map con claves estándar como `list`, `items`, `data`, `results`, o `entities`
  /// - Estructuras anidadas (ej. `{ data: { items: [...] } }`)
  static List<Map<String, dynamic>> unwrapList(dynamic responseData) {
    if (responseData == null) return [];
    if (responseData is List) {
      return responseData
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    if (responseData is Map) {
      final candidates = [
        responseData['list'],
        responseData['items'],
        responseData['data'],
        responseData['results'],
        responseData['entities'],
      ];
      for (final candidate in candidates) {
        if (candidate is List) {
          return candidate
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        } else if (candidate is Map) {
          final nestedCandidates = [
            candidate['list'],
            candidate['items'],
            candidate['data'],
            candidate['results'],
          ];
          for (final nested in nestedCandidates) {
            if (nested is List) {
              return nested
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList();
            }
          }
        }
      }
    }
    return [];
  }

  /// Extrae y normaliza de forma segura un mapa [Map<String, dynamic>]
  /// a partir de cualquier respuesta del backend:
  /// - `Map` directo
  /// - Map con clave `data` o `item` conteniendo un mapa interno
  static Map<String, dynamic>? unwrapMap(dynamic responseData) {
    if (responseData == null) return null;
    if (responseData is Map) {
      if (responseData['data'] is Map) {
        return Map<String, dynamic>.from(responseData['data'] as Map);
      }
      if (responseData['item'] is Map) {
        return Map<String, dynamic>.from(responseData['item'] as Map);
      }
      return Map<String, dynamic>.from(responseData);
    }
    return null;
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await authStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
      final response = await refreshDio.post(
        '/auth/refresh',
        options: Options(
          headers: {'Authorization': 'Bearer $refreshToken'},
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final tokens = data is Map && data['tokens'] is Map ? data['tokens'] : null;
        final newAccessToken = tokens?['access_token'] ?? tokens?['accessToken'] ?? (data is Map ? (data['accessToken'] ?? data['access_token']) : null);
        final newRefreshToken = tokens?['refresh_token'] ?? tokens?['refreshToken'] ?? (data is Map ? (data['refreshToken'] ?? data['refresh_token']) : refreshToken);

        if (newAccessToken != null) {
          await authStorage.saveTokens(
            accessToken: newAccessToken.toString(),
            refreshToken: newRefreshToken.toString(),
          );
          return true;
        }
      }
    } catch (_) {
      // Si falla el refresco de token, limpiamos la sesión
      await authStorage.clearTokens();
    }
    return false;
  }
}
