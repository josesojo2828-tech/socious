import 'package:dio/dio.dart';

/// A failure the UI can render verbatim.
///
/// Nest answers errors as `{ statusCode, message, error }` where `message` is a
/// string or, for validation errors, a list of strings. Both shapes are folded
/// into one sentence in neutral Spanish.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  factory ApiException.fromDio(DioException error) {
    final statusCode = error.response?.statusCode;
    final serverMessage = _extractMessage(error.response?.data);

    if (serverMessage != null && serverMessage.trim().isNotEmpty) {
      return ApiException(serverMessage.trim(), statusCode: statusCode);
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          'La conexión tardó demasiado. Revisá tu internet.',
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          'No se pudo conectar con el servidor. Revisá la dirección de la API.',
        );
      case DioExceptionType.cancel:
        return const ApiException('La solicitud se canceló.');
      default:
        break;
    }

    if (statusCode == 401 || statusCode == 403) {
      return const ApiException(
        'Tu sesión expiró. Iniciá sesión de nuevo.',
        statusCode: 401,
      );
    }
    if (statusCode == 404) {
      return const ApiException('No se encontró el recurso.', statusCode: 404);
    }
    if (statusCode != null && statusCode >= 500) {
      return ApiException(
        'El servidor falló. Intentá de nuevo en un momento.',
        statusCode: statusCode,
      );
    }

    return ApiException('Algo salió mal. Intentá de nuevo.', statusCode: statusCode);
  }

  static String? _extractMessage(dynamic data) {
    if (data is String) return data;
    if (data is! Map) return null;

    final message = data['message'];
    if (message is String) return message;
    if (message is List && message.isNotEmpty) {
      return message.map((item) => '$item').join('. ');
    }
    return null;
  }

  @override
  String toString() => message;
}
