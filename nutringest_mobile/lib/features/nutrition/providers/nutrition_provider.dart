import 'package:flutter/material.dart';
import '../models/food_item_model.dart';
import '../models/portion_distribution_model.dart';
import '../models/nutritional_plan_model.dart';
import '../models/exchange_list_model.dart';
import '../services/nutrition_service.dart';

class NutritionProvider extends ChangeNotifier {
  final NutritionService _service;

  NutritionalPlanModel? _activePlan;
  PortionDistributionModel? _currentDistribution;
  List<FoodItemModel> _foods = [];
  
  int _selectedDayIndex = 0;
  String _searchQuery = '';
  String _selectedCategory = 'Todos';
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalFoods = 0;
  bool _isLoading = false;
  String? _errorMessage;

  NutritionProvider({NutritionService? service}) : _service = service ?? NutritionService();

  // Getters
  NutritionalPlanModel? get activePlan => _activePlan;
  PortionDistributionModel? get currentDistribution => _currentDistribution;
  List<FoodItemModel> get foods => _foods;
  int get selectedDayIndex => _selectedDayIndex;
  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  int get totalFoods => _totalFoods;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  static const List<String> weekDays = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  String get selectedDayName => weekDays[_selectedDayIndex % weekDays.length];

  DayPlanModel? get currentDayPlan {
    if (_activePlan == null) return null;
    return _activePlan!.getDay(selectedDayName);
  }

  /// Cargar toda la información nutricional de un paciente
  Future<void> loadPatientNutritionData(String patientId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _service.getActivePlan(patientId),
        _service.getPortionDistribution(patientId),
        _service.getFoodCatalogPaginated(page: 1, limit: 10),
      ]);

      _activePlan = results[0] as NutritionalPlanModel?;
      _currentDistribution = results[1] as PortionDistributionModel?;
      final paginatedFoods = results[2] as PaginatedResponse<FoodItemModel>;
      _foods = paginatedFoods.items;
      _totalPages = paginatedFoods.totalPages;
      _totalFoods = paginatedFoods.total;
      _currentPage = paginatedFoods.currentPage;
    } catch (e) {
      _errorMessage = 'Error al cargar información nutricional: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cambiar el día seleccionado en el visor del plan
  void selectDay(int index) {
    if (index >= 0 && index < weekDays.length) {
      _selectedDayIndex = index;
      notifyListeners();
    }
  }

  /// Cargar catálogo de alimentos con paginación explícita (10 por página)
  Future<void> fetchFoodCatalogPage({int page = 1}) async {
    _currentPage = page;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _service.getFoodCatalogPaginated(
        page: _currentPage,
        limit: 10,
        query: _searchQuery,
        category: _selectedCategory,
      );
      _foods = res.items;
      _totalPages = res.totalPages;
      _totalFoods = res.total;
      _currentPage = res.currentPage;
    } catch (e) {
      _errorMessage = 'Error al cargar alimentos: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Buscar alimentos por consulta de texto en vivo
  Future<void> setSearchQuery(String query) async {
    _searchQuery = query;
    _currentPage = 1;
    await fetchFoodCatalogPage(page: 1);
  }

  /// Seleccionar categoría de alimentos
  Future<void> selectCategory(String category) async {
    _selectedCategory = category;
    _currentPage = 1;
    await fetchFoodCatalogPage(page: 1);
  }

  /// Ajustar cantidad de raciones en la matriz por grupo (Lácteos, Carnes, etc.)
  void updatePortion(String groupKey, int delta) {
    if (_currentDistribution == null) return;

    final currentCount = _currentDistribution!.getPortionsCount(groupKey);
    final newCount = (currentCount + delta).clamp(0, 50);

    final updatedMap = Map<String, int>.from(_currentDistribution!.portions);
    updatedMap[groupKey] = newCount;

    _currentDistribution = _currentDistribution!.copyWith(portions: updatedMap);
    notifyListeners();
  }

  /// Guardar matriz de raciones de intercambio
  Future<bool> saveCurrentPortionDistribution() async {
    if (_currentDistribution == null) return false;

    _isLoading = true;
    notifyListeners();

    try {
      _currentDistribution = await _service.savePortionDistribution(_currentDistribution!);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'No se pudieron guardar las raciones: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
