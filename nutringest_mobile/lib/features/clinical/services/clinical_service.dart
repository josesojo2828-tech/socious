import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/anthropometry_model.dart';
import '../models/anamnesis_model.dart';
import '../models/sports_history_model.dart';
import '../models/pediatric_history_model.dart';

class ClinicalService {
  final ApiClient _apiClient;

  ClinicalService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Obtener historia deportiva de un paciente
  Future<SportsHistoryModel?> getSportsHistory(String patientId) async {
    try {
      final response = await _apiClient.dio.get(
        '/sport-history',
        queryParameters: {'patientId': patientId},
      );
      if (response.statusCode == 200 && response.data != null) {
        final rawData = response.data;
        if (rawData is Map<String, dynamic> && rawData.isNotEmpty) {
          final entity = rawData['entity'] ?? rawData['data'] ?? rawData;
          if (entity is Map<String, dynamic> && entity.isNotEmpty && entity['id'] != null) {
            return SportsHistoryModel.fromJson(entity);
          } else if (rawData['id'] != null) {
            return SportsHistoryModel.fromJson(rawData);
          }
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
    } catch (_) {}

    return null;
  }

  /// Obtener historia clínica pediátrica de un paciente
  Future<PediatricHistoryModel?> getPediatricHistory(String patientId) async {
    try {
      final response = await _apiClient.dio.get(
        '/pediatric-history',
        queryParameters: {'patientId': patientId},
      );
      if (response.statusCode == 200 && response.data != null) {
        final rawData = response.data;
        if (rawData is Map<String, dynamic> && rawData.isNotEmpty) {
          if (rawData['id'] != null) {
            return PediatricHistoryModel.fromJson(rawData);
          } else if (rawData['entity'] is Map<String, dynamic>) {
            return PediatricHistoryModel.fromJson(rawData['entity'] as Map<String, dynamic>);
          } else if (rawData['data'] is Map<String, dynamic>) {
            return PediatricHistoryModel.fromJson(rawData['data'] as Map<String, dynamic>);
          }
        } else if (rawData is List && rawData.isNotEmpty) {
          final first = rawData.first;
          if (first is Map<String, dynamic> && first['id'] != null) {
            return PediatricHistoryModel.fromJson(first);
          }
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 204) {
        return null;
      }
    } catch (_) {}

    return null;
  }

  /// Guardar o actualizar historia clínica pediátrica
  Future<PediatricHistoryModel?> savePediatricHistory(PediatricHistoryModel history) async {
    try {
      final isUpdate = history.id.isNotEmpty;
      final path = isUpdate
          ? '/pediatric-history/${history.id}/update/api'
          : '/pediatric-history/create/api';
      final response = await _apiClient.dio.post(
        path,
        data: history.toJson(),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        final resData = response.data;
        final entity = resData['entity'] ?? resData['pediatricHistory'] ?? resData;
        if (entity is Map<String, dynamic>) {
          return PediatricHistoryModel.fromJson(entity);
        }
      }
    } catch (_) {}
    return history;
  }

  /// Obtener historial antropométrico de un paciente
  Future<List<AnthropometryModel>> getAnthropometryHistory(String patientId) async {
    try {
      final response = await _apiClient.dio.get('/clinical/anthropometry/patient/$patientId');
      if (response.statusCode == 200 && response.data != null) {
        final dynamic rawData = response.data;
        List<dynamic> items = [];
        if (rawData is List) {
          items = rawData;
        } else if (rawData is Map<String, dynamic> && rawData['items'] is List) {
          items = rawData['items'];
        }
        if (items.isNotEmpty) {
          final list = items.map((e) => AnthropometryModel.fromJson(e as Map<String, dynamic>)).toList();
          list.sort((a, b) => b.date.compareTo(a.date));
          return list;
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return [];
      }
    } catch (_) {}

    return [];
  }

  /// Guardar o actualizar una medición antropométrica
  Future<AnthropometryModel> saveAnthropometry(AnthropometryModel measurement) async {
    final response = await _apiClient.dio.post(
      '/clinical/anthropometry',
      data: measurement.toJson(),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final resData = response.data;
      final entity = resData['entity'] ?? resData['anthropometry'] ?? resData;
      if (entity is Map<String, dynamic>) {
        return AnthropometryModel.fromJson(entity);
      }
    }
    return measurement;
  }

  /// Obtener ficha de anamnesis clínica de un paciente
  Future<AnamnesisModel?> getAnamnesis(String patientId) async {
    try {
      final response = await _apiClient.dio.get('/clinical/anamnesis/patient/$patientId');
      if (response.statusCode == 200 && response.data != null) {
        final rawData = response.data;
        if (rawData is Map<String, dynamic>) {
          return AnamnesisModel.fromJson(rawData);
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
    } catch (_) {}

    return null;
  }

  /// Guardar o actualizar ficha de anamnesis clínica
  Future<AnamnesisModel> saveAnamnesis(AnamnesisModel anamnesis) async {
    final response = await _apiClient.dio.post(
      '/clinical/anamnesis',
      data: anamnesis.toJson(),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final resData = response.data;
      final entity = resData['entity'] ?? resData['anthropometry'] ?? resData;
      if (entity is Map<String, dynamic>) {
        return AnamnesisModel.fromJson(entity);
      }
    }
    return anamnesis;
  }
}
