import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../models/food_item_model.dart';
import '../models/portion_distribution_model.dart';
import '../models/nutritional_plan_model.dart';
import '../models/menu_model.dart';
import '../models/exchange_list_model.dart';
import '../models/institutional_food_model.dart';

class NutritionService {
  final ApiClient _apiClient;

  NutritionService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Obtener el plan activo del paciente vía API `/api/nutrition/plans`
  Future<NutritionalPlanModel?> getActivePlan(String patientId) async {
    try {
      final response = await _apiClient.dio.get('/nutrition/plans/patient/$patientId');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          return NutritionalPlanModel.fromJson(data);
        } else if (data is List && data.isNotEmpty) {
          return NutritionalPlanModel.fromJson(data.first as Map<String, dynamic>);
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
    } catch (_) {}

    return null;
  }

  int _extractTotal(dynamic data, int fallback) {
    if (data is Map<String, dynamic>) {
      return (data['total'] as num?)?.toInt() ??
          (data['totalRecords'] as num?)?.toInt() ??
          fallback;
    }
    return fallback;
  }

  int _extractTotalPages(dynamic data, int total, int limit) {
    if (data is Map<String, dynamic>) {
      final explicitPages = (data['totalPages'] as num?)?.toInt() ??
          (data['pages'] as num?)?.toInt();
      if (explicitPages != null && explicitPages > 0) return explicitPages;
    }
    final calc = (total / limit).ceil();
    return calc < 1 ? 1 : calc;
  }

  int _extractCurrentPage(dynamic data, int requestedPage) {
    if (data is Map<String, dynamic>) {
      return (data['currentPage'] as num?)?.toInt() ??
          (data['page'] as num?)?.toInt() ??
          requestedPage;
    }
    return requestedPage;
  }

  /// Obtener catálogo de alimentos paginado vía API `GET /api/foods` (o `/api/food`)
  Future<PaginatedResponse<FoodItemModel>> getFoods({
    int page = 1,
    int limit = 10,
    String? query,
    String? category,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
        if (category != null && category.trim().isNotEmpty && category != 'Todos')
          'category': category.trim(),
      };

      Response response;
      try {
        response = await _apiClient.dio.get(
          '/foods',
          queryParameters: queryParams,
        );
      } on DioException catch (dioErr) {
        if (dioErr.response?.statusCode == 404) {
          response = await _apiClient.dio.get(
            '/food',
            queryParameters: queryParams,
          );
        } else {
          rethrow;
        }
      }

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        final foods = rawList
            .map((e) => FoodItemModel.fromJson(e))
            .toList();

        return PaginatedResponse<FoodItemModel>(
          items: foods,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getFoods: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<FoodItemModel>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getFoods: $e');
      return PaginatedResponse<FoodItemModel>.empty(page: page);
    }

    return PaginatedResponse<FoodItemModel>.empty(page: page);
  }

  /// Obtener catálogo de alimentos paginado vía API `/api/foods` (alias a `getFoods`)
  Future<PaginatedResponse<FoodItemModel>> getFoodCatalogPaginated({
    int page = 1,
    int limit = 10,
    String? query,
    String? category,
  }) => getFoods(page: page, limit: limit, query: query, category: category);

  /// Obtener catálogo de alimentos vía API `/api/foods` (compatibilidad)
  Future<List<FoodItemModel>> getFoodCatalog({String? query, String? category}) async {
    final paginated = await getFoods(
      page: 1,
      limit: 50,
      query: query,
      category: category,
    );
    return paginated.items;
  }

  /// Obtener distribución de raciones del paciente
  Future<PortionDistributionModel?> getPortionDistribution(String patientId) async {
    try {
      final response = await _apiClient.dio.get('/nutrition/portions/$patientId');
      if (response.statusCode == 200 && response.data != null) {
        return PortionDistributionModel.fromJson(response.data as Map<String, dynamic>);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
    } catch (_) {}

    return null;
  }

  /// Guardar / actualizar distribución de raciones
  Future<PortionDistributionModel> savePortionDistribution(PortionDistributionModel distribution) async {
    final response = await _apiClient.dio.post(
      '/nutrition/portions',
      data: distribution.toJson(),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final resData = response.data;
      if (resData is Map<String, dynamic>) {
        return PortionDistributionModel.fromJson(resData);
      }
    }
    return distribution;
  }

  // ===========================================================================
  // MENÚS CATALOG & MENÚ FICHA 360° (API /api/menu)
  // ===========================================================================

  /// Listado de menús con paginación y filtros: GET /api/menu?limit=10&page=X
  Future<PaginatedResponse<MenuModel>> getMenus({
    int page = 1,
    int limit = 10,
    String? q,
    String? category,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (q != null && q.trim().isNotEmpty) {
        queryParams['q'] = q.trim();
      }
      if (category != null && category.trim().isNotEmpty && category != 'TODOS') {
        queryParams['category'] = category.trim();
      }

      final response = await _apiClient.dio.get(
        '/menu',
        queryParameters: queryParams,
      );

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        final menuItems = rawList
            .map((e) => MenuModel.fromJson(e))
            .toList();

        return PaginatedResponse<MenuModel>(
          items: menuItems,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getMenus: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<MenuModel>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getMenus: $e');
      return PaginatedResponse<MenuModel>.empty(page: page);
    }
    return PaginatedResponse<MenuModel>.empty(page: page);
  }

  /// Obtener métricas KPI del dashboard de menús: GET /api/menu/dashboard
  Future<MenuDashboardMetricsModel> getMenuDashboard() async {
    try {
      final response = await _apiClient.dio.get('/menu/dashboard');
      if (response.statusCode == 200 && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          return MenuDashboardMetricsModel.fromJson(response.data as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return MenuDashboardMetricsModel.empty();
  }

  /// Obtener detalle completo del menú con ingredientes y condimentos: GET /api/menu/$id/detail/api
  Future<MenuModel?> getMenuDetail(String id) async {
    try {
      final response = await _apiClient.dio.get('/menu/$id/detail/api');
      if (response.statusCode == 200 && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          return MenuModel.fromJson(response.data as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Crear nuevo menú: POST /api/menu/create/api
  Future<MenuModel?> createMenu({
    required String name,
    required String category,
    String? description,
    String? tags,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/menu/create/api',
        data: {
          'name': name,
          'category': category,
          if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
          if (tags != null && tags.trim().isNotEmpty) 'tags': tags.trim(),
        },
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final resData = response.data;
        if (resData is Map<String, dynamic>) {
          final entity = resData['entity'] ?? resData;
          if (entity is Map<String, dynamic>) {
            return MenuModel.fromJson(entity);
          }
        }
      }
    } catch (_) {
      rethrow;
    }
    return null;
  }

  /// Actualizar datos de un menú: POST /api/menu/$id/update/api
  Future<MenuModel?> updateMenu(String id, Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/menu/$id/update/api',
        data: data,
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final resData = response.data;
        if (resData is Map<String, dynamic>) {
          final entity = resData['entity'] ?? resData;
          if (entity is Map<String, dynamic>) {
            return MenuModel.fromJson(entity);
          }
        }
      }
    } catch (_) {
      rethrow;
    }
    return null;
  }

  /// Eliminar menú: POST /api/menu/$id/delete/api
  Future<bool> deleteMenu(String id) async {
    try {
      final response = await _apiClient.dio.post('/menu/$id/delete/api');
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Agregar ingrediente al menú: POST /api/menu/$menuId/items/api
  Future<MenuModel?> addMenuItem(String menuId, Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/menu/$menuId/items/api',
        data: data,
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          return MenuModel.fromJson(response.data as Map<String, dynamic>);
        }
      }
    } catch (_) {
      rethrow;
    }
    return null;
  }

  /// Eliminar ingrediente del menú: DELETE /api/menu/items/$itemId/api
  Future<bool> deleteMenuItem(String itemId) async {
    try {
      final response = await _apiClient.dio.delete('/menu/items/$itemId/api');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// Agregar condimento al menú: POST /api/menu/$menuId/condiments/api
  Future<dynamic> addMenuCondiment(String menuId, Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/menu/$menuId/condiments/api',
        data: data,
      );
      return response.data;
    } catch (_) {
      rethrow;
    }
  }

  /// Eliminar condimento del menú: DELETE /api/menu/condiments/$condimentId/api
  Future<bool> deleteMenuCondiment(String condimentId) async {
    try {
      final response = await _apiClient.dio.delete('/menu/condiments/$condimentId/api');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// Listado de condimentos con paginación: GET /api/condiments?limit=10&page=X
  Future<PaginatedResponse<Map<String, dynamic>>> getCondimentsPaginated({
    int page = 1,
    int limit = 10,
    String? q,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/condiments',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        },
      );

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        return PaginatedResponse<Map<String, dynamic>>(
          items: rawList,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getCondiments: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<Map<String, dynamic>>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getCondiments: $e');
      return PaginatedResponse<Map<String, dynamic>>.empty(page: page);
    }
    return PaginatedResponse<Map<String, dynamic>>.empty(page: page);
  }

  /// Buscar condimentos en el catálogo general: GET /api/condiments (compatibilidad)
  Future<List<Map<String, dynamic>>> getCondiments({String? q, int page = 1, int limit = 50}) async {
    final paginated = await getCondimentsPaginated(page: page, limit: limit, q: q);
    return paginated.items;
  }

  // ===========================================================================
  // LISTAS DE INTERCAMBIO (API /api/exchange-list & /api/exchange-food)
  // ===========================================================================

  /// Listado de listas de intercambio del nutricionista logueado: GET /api/exchange-list?limit=10&page=X
  /// Sin restricciones de filtros de paciente.
  Future<PaginatedResponse<ExchangeListModel>> getExchangeLists({
    int page = 1,
    int limit = 10,
    String? q,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (q != null && q.trim().isNotEmpty) {
        queryParams['q'] = q.trim();
      }

      final response = await _apiClient.dio.get(
        '/exchange-list',
        queryParameters: queryParams,
      );

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        final exchangeLists = rawList
            .map((e) => ExchangeListModel.fromJson(e))
            .toList();

        return PaginatedResponse<ExchangeListModel>(
          items: exchangeLists,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getExchangeLists: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<ExchangeListModel>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getExchangeLists: $e');
      return PaginatedResponse<ExchangeListModel>.empty(page: page);
    }

    return PaginatedResponse<ExchangeListModel>.empty(page: page);
  }

  /// Obtener detalle completo de lista de intercambio: GET /api/exchange-list/$id/detail/api
  Future<ExchangeListModel?> getExchangeListDetail(String id) async {
    try {
      final response = await _apiClient.dio.get('/exchange-list/$id/detail/api');
      if (response.statusCode == 200 && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          return ExchangeListModel.fromJson(response.data as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Eliminar lista de intercambio: POST /api/exchange-list/$id/delete/api
  Future<bool> deleteExchangeList(String id) async {
    try {
      final response = await _apiClient.dio.post('/exchange-list/$id/delete/api');
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Listado de alimentos de intercambio con paginación: GET /api/exchange-food?limit=10&page=X
  Future<PaginatedResponse<FoodExchangeModel>> getExchangeFoods({
    int page = 1,
    int limit = 10,
    String? q,
    String? category,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/exchange-food',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
          if (category != null && category.trim().isNotEmpty && category != 'Todos')
            'category': category.trim(),
        },
      );

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        final list = rawList
            .map((e) => FoodExchangeModel.fromJson(e))
            .toList();

        return PaginatedResponse<FoodExchangeModel>(
          items: list,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getExchangeFoods: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<FoodExchangeModel>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getExchangeFoods: $e');
      return PaginatedResponse<FoodExchangeModel>.empty(page: page);
    }

    return PaginatedResponse<FoodExchangeModel>.empty(page: page);
  }

  /// Crear nueva lista de intercambio: POST /api/exchange-list
  Future<ExchangeListModel?> createExchangeList({
    required String name,
    String? description,
    String? category,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      if (category != null && category.trim().isNotEmpty) 'category': category.trim(),
    };

    try {
      Response response;
      try {
        response = await _apiClient.dio.post('/exchange-list', data: payload);
      } on DioException catch (dioErr) {
        if (dioErr.response?.statusCode == 404) {
          response = await _apiClient.dio.post('/exchange-list/create/api', data: payload);
        } else {
          rethrow;
        }
      }

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final resData = response.data;
        if (resData is Map<String, dynamic>) {
          final entity = resData['entity'] ?? resData;
          if (entity is Map<String, dynamic>) {
            return ExchangeListModel.fromJson(entity);
          }
        }
      }
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in createExchangeList: $e');
      rethrow;
    }
    return null;
  }

  // ===========================================================================
  // ALIMENTACIÓN COLECTIVA / INSTITUCIONAL (API /api/institutional-calculations o /api/institutional-food)
  // ===========================================================================

  /// Listado de alimentación institucional / menús masivos: GET /api/institutional-calculations o GET /api/institutional-food
  Future<PaginatedResponse<InstitutionalFoodModel>> getInstitutionalFood({
    int page = 1,
    int limit = 10,
    String? q,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
      };

      Response response;
      try {
        response = await _apiClient.dio.get(
          '/institutional-calculations',
          queryParameters: queryParams,
        );
      } on DioException catch (dioErr) {
        if (dioErr.response?.statusCode == 404) {
          try {
            response = await _apiClient.dio.get(
              '/institutional-food',
              queryParameters: queryParams,
            );
          } on DioException catch (dioErr2) {
            if (dioErr2.response?.statusCode == 404) {
              response = await _apiClient.dio.get(
                '/nutrition/institutional-food',
                queryParameters: queryParams,
              );
            } else {
              rethrow;
            }
          }
        } else {
          rethrow;
        }
      }

      debugPrint('[NUTRITION_SERVICE] GET ${response.requestOptions.uri}');
      debugPrint('[NUTRITION_SERVICE] Status: ${response.statusCode}');
      debugPrint('[NUTRITION_SERVICE] Response structure: ${response.data is Map ? (response.data as Map).keys.toList() : (response.data is List ? "List(${(response.data as List).length})" : response.data.runtimeType)}');

      if (response.statusCode == 200 && response.data != null) {
        final dynamic data = response.data;
        final rawList = ApiClient.unwrapList(data);

        final total = _extractTotal(data, rawList.length);
        final totalPages = _extractTotalPages(data, total, limit);
        final currentPage = _extractCurrentPage(data, page);

        final items = rawList
            .map((e) => InstitutionalFoodModel.fromJson(e))
            .toList();

        return PaginatedResponse<InstitutionalFoodModel>(
          items: items,
          total: total,
          currentPage: currentPage,
          totalPages: totalPages < 1 ? 1 : totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        );
      }
    } on DioException catch (e) {
      debugPrint('[NUTRITION_SERVICE] DioException in getInstitutionalFood: ${e.message} [${e.response?.statusCode}]');
      return PaginatedResponse<InstitutionalFoodModel>.empty(page: page);
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in getInstitutionalFood: $e');
      return PaginatedResponse<InstitutionalFoodModel>.empty(page: page);
    }

    return PaginatedResponse<InstitutionalFoodModel>.empty(page: page);
  }

  /// Crear simulación de cálculo institucional: POST /api/institutional-calculations
  Future<InstitutionalFoodModel?> createInstitutionalCalculation({
    required String title,
    String? description,
    required int totalPeople,
    required int maleCount,
    required int femaleCount,
    required List<double> sampleWeights,
    required String activityLevel,
    double? activityFactor,
    List<Map<String, dynamic>>? meals,
  }) async {
    final payload = <String, dynamic>{
      'title': title,
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      'totalPeople': totalPeople,
      'maleCount': maleCount,
      'femaleCount': femaleCount,
      'sampleWeights': sampleWeights,
      'activityLevel': activityLevel,
      'activityFactor': ?activityFactor,
      'meals': meals ?? [
        {'mealType': 'DESAYUNO', 'percentage': 25, 'proteinPercentage': 15, 'fatPercentage': 35, 'carbsPercentage': 50},
        {'mealType': 'ALMUERZO', 'percentage': 40, 'proteinPercentage': 15, 'fatPercentage': 35, 'carbsPercentage': 50},
        {'mealType': 'CENA', 'percentage': 35, 'proteinPercentage': 15, 'fatPercentage': 35, 'carbsPercentage': 50},
      ],
    };

    try {
      final response = await _apiClient.dio.post(
        '/institutional-calculations',
        data: payload,
      );

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final resData = response.data;
        if (resData is Map<String, dynamic>) {
          final entity = resData['entity'] ?? resData;
          if (entity is Map<String, dynamic>) {
            return InstitutionalFoodModel.fromJson(entity);
          }
        }
      }
    } catch (e) {
      debugPrint('[NUTRITION_SERVICE] Error in createInstitutionalCalculation: $e');
      rethrow;
    }
    return null;
  }
}


