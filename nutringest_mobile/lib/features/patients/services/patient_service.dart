import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../../clinical/models/sports_history_model.dart';
import '../../clinical/models/pediatric_history_model.dart';
import '../models/patient_model.dart';
import '../models/patient_team_member_model.dart';

class PatientService {
  final ApiClient _apiClient;

  PatientService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Obtiene la lista de pacientes con filtros opcionales de búsqueda y estado
  Future<List<PatientModel>> getPatients({String? query, String? status, int limit = 100}) async {
    try {
      debugPrint('🔍 [PatientService.getPatients] Fetching patients from /patients...');
      final response = await _apiClient.dio.get(
        '/patients',
        queryParameters: {
          'limit': limit,
          if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
          if (status != null && status.toUpperCase() != 'ALL') 'status': status,
        },
      );

      debugPrint('📥 [PatientService.getPatients] Response Status: ${response.statusCode}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic rawData = response.data;
        debugPrint('📥 [PatientService.getPatients] Raw Data Keys: ${rawData is Map ? rawData.keys.toList() : rawData.runtimeType}');
        List<dynamic> items = [];

        if (rawData is List) {
          items = rawData;
        } else if (rawData is Map) {
          final mapData = Map<String, dynamic>.from(rawData);
          if (mapData['list'] is List) {
            items = mapData['list'];
          } else if (mapData['data'] is List) {
            items = mapData['data'];
          } else if (mapData['items'] is List) {
            items = mapData['items'];
          } else if (mapData['results'] is List) {
            items = mapData['results'];
          } else if (mapData['patients'] is List) {
            items = mapData['patients'];
          }
        }

        debugPrint('📥 [PatientService.getPatients] Parsed ${items.length} items from backend response.');

        if (items.isNotEmpty) {
          final apiPatients = items
              .whereType<Map>()
              .map((e) => PatientModel.fromJson(Map<String, dynamic>.from(e)))
              .toList();
          debugPrint('✅ [PatientService.getPatients] Successfully deserialized ${apiPatients.length} PatientModel objects.');
          return _filterPatientsList(apiPatients, query: query, status: status);
        }
      }
    } catch (e, st) {
      debugPrint('❌ [PatientService.getPatients] ERROR: $e\n$st');
    }

    return [];
  }

  /// Obtiene un paciente específico por su ID
  Future<PatientModel?> getPatientById(String id) async {
    try {
      final response = await _apiClient.dio.get('/patients/$id');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final mapData = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
        return PatientModel.fromJson(mapData);
      }
    } catch (e, st) {
      debugPrint('Error fetching patient by id $id: $e\n$st');
    }

    return null;
  }

  /// Registra un nuevo paciente en la API
  Future<PatientModel> createPatient(Map<String, dynamic> data) async {
    final response = await _apiClient.dio.post(
      '/patients/create/api',
      data: data,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final resData = response.data;
      final entity = resData['entity'] ?? resData['patient'] ?? resData;
      if (entity is Map<String, dynamic>) {
        return PatientModel.fromJson(entity);
      }
    }

    throw Exception('Error al crear el paciente');
  }

  /// Actualiza los datos de un paciente existente
  Future<PatientModel> updatePatient(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.dio.post(
      '/patients/$id/update/api',
      data: data,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final resData = response.data;
      final entity = resData['entity'] ?? resData['patient'] ?? resData;
      if (entity is Map<String, dynamic>) {
        return PatientModel.fromJson(entity);
      }
    }

    throw Exception('Error al actualizar el paciente con ID $id');
  }

  List<PatientModel> _filterPatientsList(
    List<PatientModel> list, {
    String? query,
    String? status,
  }) {
    var result = List<PatientModel>.from(list);

    if (status != null && status.isNotEmpty && status.toUpperCase() != 'ALL') {
      result = result.where((p) => p.status.toUpperCase() == status.toUpperCase()).toList();
    }

    if (query != null && query.trim().isNotEmpty) {
      final q = query.trim().toLowerCase();
      result = result.where((p) {
        final nameMatch = p.fullName.toLowerCase().contains(q);
        final dniMatch = p.dni?.toLowerCase().contains(q) ?? false;
        final emailMatch = p.email?.toLowerCase().contains(q) ?? false;
        final objMatch = p.objective?.toLowerCase().contains(q) ?? false;
        return nameMatch || dniMatch || emailMatch || objMatch;
      }).toList();
    }

    return result;
  }

  /// Obtiene el equipo multidisciplinario / de cuidado de un paciente
  Future<List<PatientTeamMemberModel>> getTeamMembers(String patientId) async {
    try {
      final response = await _apiClient.dio.get('/nutringest/patient-referral/team/$patientId');
      if (response.statusCode == 200 && response.data != null) {
        final dynamic rawData = response.data;
        List<dynamic> items = [];
        if (rawData is List) {
          items = rawData;
        } else if (rawData is Map<String, dynamic> && rawData['data'] is List) {
          items = rawData['data'];
        }
        return items
            .whereType<Map>()
            .map((e) => PatientTeamMemberModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (e, st) {
      debugPrint('Error fetching team members for patient $patientId: $e\n$st');
    }
    return [];
  }

  /// Remueve o desasigna a un profesional del equipo del paciente
  Future<bool> removeTeamMember(String patientId, String nutritionistId) async {
    try {
      final response = await _apiClient.dio.delete('/nutringest/patient-referral/team/$patientId/$nutritionistId');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e, st) {
      debugPrint('Error removing team member $nutritionistId from patient $patientId: $e\n$st');
      return false;
    }
  }

  /// Busca profesionales colaboradores por email
  Future<List<CollaboratorSearchResultModel>> searchCollaborators(String email) async {
    try {
      final response = await _apiClient.dio.get(
        '/nutringest/patient-referral/collaborator/search',
        queryParameters: {'email': email},
      );
      if (response.statusCode == 200 && response.data != null) {
        final dynamic rawData = response.data;
        List<dynamic> items = [];
        if (rawData is List) {
          items = rawData;
        } else if (rawData is Map<String, dynamic> && rawData['data'] is List) {
          items = rawData['data'];
        }
        return items
            .whereType<Map>()
            .map((e) => CollaboratorSearchResultModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (e) {
      debugPrint('Error searching collaborators for email $email: $e');
    }
    return [];
  }

  /// Invita o asigna a un profesional al equipo por email
  Future<bool> inviteCollaborator(String patientId, {required String email, String? message}) async {
    try {
      final response = await _apiClient.dio.post(
        '/nutringest/patient-referral/collaborator/$patientId',
        data: {
          'email': email,
          if (message != null && message.trim().isNotEmpty) 'message': message.trim(),
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error inviting collaborator to patient $patientId: $e');
      rethrow;
    }
  }

  /// Agrega directamente a un colaborador por nutritionistId
  Future<bool> addCollaborator(String patientId, {required String nutritionistId, String? message}) async {
    try {
      final response = await _apiClient.dio.post(
        '/nutringest/patient-referral/team/$patientId/add',
        data: {
          'nutritionistId': nutritionistId,
          if (message != null && message.trim().isNotEmpty) 'message': message.trim(),
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error adding collaborator to patient $patientId: $e');
      rethrow;
    }
  }

  /// Obtiene la historia deportiva de un paciente (retorna null en 404 o si no existe)
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

  /// Obtiene la historia clínica pediátrica de un paciente
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
    } catch (e) {
      debugPrint('Error getting pediatric history for patient $patientId: $e');
    }

    return null;
  }
}
