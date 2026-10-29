import 'package:flutter/foundation.dart';
import '../models/anthropometry_model.dart';
import '../models/anamnesis_model.dart';
import '../models/sports_history_model.dart';
import '../models/pediatric_history_model.dart';
import '../services/clinical_service.dart';

class ClinicalProvider extends ChangeNotifier {
  final ClinicalService _clinicalService;

  List<AnthropometryModel> _history = [];
  AnamnesisModel? _anamnesis;
  SportsHistoryModel? _sportsHistory;
  PediatricHistoryModel? _pediatricHistory;
  bool _isLoading = false;
  String? _errorMessage;
  String? _activePatientId;

  ClinicalProvider({ClinicalService? clinicalService})
      : _clinicalService = clinicalService ?? ClinicalService();

  List<AnthropometryModel> get history => _history;
  AnthropometryModel? get latestMeasurement => _history.isNotEmpty ? _history.first : null;
  AnamnesisModel? get anamnesis => _anamnesis;
  SportsHistoryModel? get sportsHistory => _sportsHistory;
  PediatricHistoryModel? get pediatricHistory => _pediatricHistory;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get activePatientId => _activePatientId;

  /// Cargar todos los datos clínicos del paciente (Historial Antropométrico + Anamnesis + Historia Deportiva + Historia Pediátrica)
  Future<void> loadClinicalData(String patientId) async {
    _activePatientId = patientId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _clinicalService.getAnthropometryHistory(patientId),
        _clinicalService.getAnamnesis(patientId),
        _clinicalService.getSportsHistory(patientId),
        _clinicalService.getPediatricHistory(patientId),
      ]);

      _history = results[0] as List<AnthropometryModel>;
      _anamnesis = results[1] as AnamnesisModel?;
      _sportsHistory = results[2] as SportsHistoryModel?;
      _pediatricHistory = results[3] as PediatricHistoryModel?;
    } catch (e) {
      _errorMessage = 'Error al cargar expedientes clínicos: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cargar únicamente la historia clínica pediátrica
  Future<void> fetchPediatricHistory(String patientId) async {
    _activePatientId = patientId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _pediatricHistory = await _clinicalService.getPediatricHistory(patientId);
    } catch (e) {
      _errorMessage = 'Error al cargar historia pediátrica: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Registrar o actualizar la historia pediátrica
  Future<bool> savePediatricHistory(PediatricHistoryModel historyModel) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _pediatricHistory = await _clinicalService.savePediatricHistory(historyModel);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Error al guardar historia pediátrica: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Cargar únicamente la historia deportiva
  Future<void> fetchSportsHistory(String patientId) async {
    _activePatientId = patientId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _sportsHistory = await _clinicalService.getSportsHistory(patientId);
    } catch (e) {
      _errorMessage = 'Error al cargar historia deportiva: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cargar únicamente el historial de mediciones antropométricas
  Future<void> fetchAnthropometryHistory(String patientId) async {
    _activePatientId = patientId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _history = await _clinicalService.getAnthropometryHistory(patientId);
    } catch (e) {
      _errorMessage = 'Error al obtener historial antropométrico: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Registrar o actualizar una medición ISAK
  Future<bool> saveAnthropometry(AnthropometryModel measurement) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _clinicalService.saveAnthropometry(measurement);
      await fetchAnthropometryHistory(measurement.patientId);
      return true;
    } catch (e) {
      _errorMessage = 'Error al guardar medición antropométrica: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Cargar únicamente la ficha de anamnesis
  Future<void> fetchAnamnesis(String patientId) async {
    _activePatientId = patientId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _anamnesis = await _clinicalService.getAnamnesis(patientId);
    } catch (e) {
      _errorMessage = 'Error al cargar anamnesis: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Registrar o actualizar la ficha de anamnesis
  Future<bool> saveAnamnesis(AnamnesisModel anamnesis) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _anamnesis = await _clinicalService.saveAnamnesis(anamnesis);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Error al guardar anamnesis: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
