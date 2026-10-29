import 'package:flutter/foundation.dart';
import '../models/waste_food_model.dart';
import '../utils/energy_calculator.dart';
import '../utils/waste_calculator.dart';

enum WasteCalculationMode { direct, inverse }

class CalculatorsProvider with ChangeNotifier {
  // --- Energy Calculator State ---
  EnergyFormula _energyFormula = EnergyFormula.mifflin;
  double _weight = 70.0;
  double _height = 170.0;
  int _age = 30;
  bool _isMale = true;
  double _bodyFatPercentage = 20.0;
  double _activityFactor = 1.375;
  double _stressFactor = 1.0;
  double _proteinGPerKg = 2.0;
  double _fatPercentage = 25.0;

  EnergyFormula get energyFormula => _energyFormula;
  double get weight => _weight;
  double get height => _height;
  int get age => _age;
  bool get isMale => _isMale;
  double get bodyFatPercentage => _bodyFatPercentage;
  double get activityFactor => _activityFactor;
  double get stressFactor => _stressFactor;
  double get proteinGPerKg => _proteinGPerKg;
  double get fatPercentage => _fatPercentage;

  EnergyCalculationResult get energyResult {
    return EnergyCalculator.calculateComplete(
      formula: _energyFormula,
      weight: _weight,
      height: _height,
      age: _age,
      isMale: _isMale,
      bodyFatPercentage: _bodyFatPercentage,
      activityFactor: _activityFactor,
      stressFactor: _stressFactor,
      proteinGPerKg: _proteinGPerKg,
      fatPercentage: _fatPercentage,
    );
  }

  void setEnergyFormula(EnergyFormula formula) {
    _energyFormula = formula;
    notifyListeners();
  }

  void updateEnergyParams({
    double? weight,
    double? height,
    int? age,
    bool? isMale,
    double? bodyFatPercentage,
    double? activityFactor,
    double? stressFactor,
    double? proteinGPerKg,
    double? fatPercentage,
  }) {
    if (weight != null) _weight = weight;
    if (height != null) _height = height;
    if (age != null) _age = age;
    if (isMale != null) _isMale = isMale;
    if (bodyFatPercentage != null) _bodyFatPercentage = bodyFatPercentage;
    if (activityFactor != null) _activityFactor = activityFactor;
    if (stressFactor != null) _stressFactor = stressFactor;
    if (proteinGPerKg != null) _proteinGPerKg = proteinGPerKg;
    if (fatPercentage != null) _fatPercentage = fatPercentage;
    notifyListeners();
  }

  void resetEnergyParams() {
    _energyFormula = EnergyFormula.mifflin;
    _weight = 70.0;
    _height = 170.0;
    _age = 30;
    _isMale = true;
    _bodyFatPercentage = 20.0;
    _activityFactor = 1.375;
    _stressFactor = 1.0;
    _proteinGPerKg = 2.0;
    _fatPercentage = 25.0;
    notifyListeners();
  }

  // --- Food Waste Calculator State ---
  WasteCalculationMode _wasteMode = WasteCalculationMode.direct;
  double _grossWeightInput = 1000.0;
  double _netWeightInput = 750.0;
  double _customWastePercentage = 15.0;
  WasteFoodModel? _selectedFood;
  final List<WasteFoodModel> _foodCatalog = WasteFoodModel.defaultCatalog;

  WasteCalculationMode get wasteMode => _wasteMode;
  double get grossWeightInput => _grossWeightInput;
  double get netWeightInput => _netWeightInput;
  double get customWastePercentage => _customWastePercentage;
  WasteFoodModel? get selectedFood => _selectedFood;
  List<WasteFoodModel> get foodCatalog => _foodCatalog;

  WasteCalculationResult get wasteResult {
    final activeWastePct = _selectedFood?.averageWastePercentage ?? _customWastePercentage;
    if (_wasteMode == WasteCalculationMode.direct) {
      return WasteCalculator.calculateDirect(
        grossWeight: _grossWeightInput,
        netWeight: _selectedFood != null ? null : _netWeightInput,
        wastePercentage: activeWastePct,
      );
    } else {
      return WasteCalculator.calculateInverse(
        netWeight: _netWeightInput,
        wastePercentage: activeWastePct,
      );
    }
  }

  void setWasteMode(WasteCalculationMode mode) {
    _wasteMode = mode;
    notifyListeners();
  }

  void setGrossWeightInput(double weight) {
    _grossWeightInput = weight;
    notifyListeners();
  }

  void setNetWeightInput(double weight) {
    _netWeightInput = weight;
    notifyListeners();
  }

  void setCustomWastePercentage(double percentage) {
    _customWastePercentage = percentage;
    _selectedFood = null;
    notifyListeners();
  }

  void selectFood(WasteFoodModel? food) {
    _selectedFood = food;
    if (food != null) {
      _customWastePercentage = food.averageWastePercentage;
    }
    notifyListeners();
  }

  void resetWasteParams() {
    _wasteMode = WasteCalculationMode.direct;
    _grossWeightInput = 1000.0;
    _netWeightInput = 750.0;
    _customWastePercentage = 15.0;
    _selectedFood = null;
    notifyListeners();
  }
}
