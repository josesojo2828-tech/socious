import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// The single HTTP entry point of the app.
///
/// Responsibilities, in order:
/// - attach `Authorization: Bearer <access token>` and `x-workspace-id`;
/// - on a 401, refresh the pair once (single-flight) and retry the request;
/// - surface failures as [ApiException] with a message the UI can show.
///
/// The backend accepts both tokens through the `Authorization` header
/// (`at.strategy.ts` / `rt.strategy.ts`), so there is no cookie or webview.
class ApiClient {
  ApiClient({
    required TokenStorage storage,
    String? baseUrl,
  })  : _storage = storage,
        _dio = Dio(_baseOptions(baseUrl ?? AppConfig.apiBaseUrl)),
        _refreshDio = Dio(_baseOptions(baseUrl ?? AppConfig.apiBaseUrl)) {
    _dio.interceptors.add(
      InterceptorsWrapper(onRequest: _onRequest, onError: _onError),
    );
  }

  static const String _retriedFlag = 'socius.retried';

  final TokenStorage _storage;
  final Dio _dio;
  final Dio _refreshDio;
  Future<bool>? _refreshing;

  Dio get dio => _dio;

  static BaseOptions _baseOptions(String baseUrl) => BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: const {'Accept': 'application/json'},
      );

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.readAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    final workspaceId = await _storage.readWorkspaceId();
    if (workspaceId != null && workspaceId.isNotEmpty) {
      options.headers['x-workspace-id'] = workspaceId;
    }

    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final options = error.requestOptions;
    final isUnauthorized = error.response?.statusCode == 401;
    final alreadyRetried = options.extra[_retriedFlag] == true;

    if (!isUnauthorized || alreadyRetried) {
      handler.next(error);
      return;
    }

    final refreshed = await _refreshOnce();
    if (!refreshed) {
      await _storage.clear();
      handler.next(error);
      return;
    }

    try {
      final response = await _dio.request<dynamic>(
        options.path,
        data: options.data,
        queryParameters: options.queryParameters,
        cancelToken: options.cancelToken,
        options: Options(
          method: options.method,
          headers: options.headers,
          contentType: options.contentType,
          responseType: options.responseType,
          extra: {...options.extra, _retriedFlag: true},
        ),
      );
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  Future<bool> _refreshOnce() {
    return _refreshing ??= _performRefresh().whenComplete(() {
      _refreshing = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final response = await _refreshDio.post<dynamic>(
        '/api/auth/refresh',
        options: Options(headers: {'Authorization': 'Bearer $refreshToken'}),
      );
      final data = response.data;
      if (data is! Map) return false;

      final accessToken = data['access_token'];
      final nextRefreshToken = data['refresh_token'];
      if (accessToken is! String || nextRefreshToken is! String) return false;

      await _storage.writeTokens(
        accessToken: accessToken,
        refreshToken: nextRefreshToken,
      );
      return true;
    } on DioException {
      return false;
    }
  }

  /// GET helper that already normalizes errors.
  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async {
    try {
      final response = await _dio.get<T>(path, queryParameters: query);
      return response.data as T;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// POST helper that already normalizes errors.
  Future<T> post<T>(String path, {Object? body}) async {
    try {
      final response = await _dio.post<T>(path, data: body);
      return response.data as T;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// PATCH helper that already normalizes errors.
  Future<T> patch<T>(String path, {Object? body}) async {
    try {
      final response = await _dio.patch<T>(path, data: body);
      return response.data as T;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
