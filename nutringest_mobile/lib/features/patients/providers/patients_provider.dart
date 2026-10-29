import 'package:flutter/foundation.dart';
import '../models/patient_model.dart';
import '../services/patient_service.dart';

class PatientsProvider extends ChangeNotifier {
  final PatientService _patientService;

  List<PatientModel> _allPatients = [];
  String _searchQuery = '';
  String _statusFilter = 'ALL'; // 'ALL', 'ACTIVE', 'INACTIVE'
  bool _isLoading = false;
  String? _errorMessage;
  PatientModel? _selectedPatient;

  PatientsProvider({PatientService? patientService})
      : _patientService = patientService ?? PatientService();

  // Getters
  List<PatientModel> get rawPatients => List.unmodifiable(_allPatients);

  /// Devuelve la lista filtrada de acuerdo al texto de búsqueda y el chip de estado
  List<PatientModel> get patients {
    return _allPatients.where((p) {
      final matchesStatus = _statusFilter == 'ALL' ||
          (_statusFilter == 'ACTIVE' && p.isActive) ||
          (_statusFilter == 'INACTIVE' && !p.isActive);

      if (!matchesStatus) return false;

      if (_searchQuery.trim().isEmpty) return true;

      final q = _searchQuery.trim().toLowerCase();
      final nameMatch = p.fullName.toLowerCase().contains(q);
      final dniMatch = p.dni?.toLowerCase().contains(q) ?? false;
      final emailMatch = p.email?.toLowerCase().contains(q) ?? false;
      final objMatch = p.objective?.toLowerCase().contains(q) ?? false;

      return nameMatch || dniMatch || emailMatch || objMatch;
    }).toList();
  }

  String get searchQuery => _searchQuery;
  String get statusFilter => _statusFilter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  PatientModel? get selectedPatient => _selectedPatient;

  int get totalCount => _allPatients.length;
  int get activeCount => _allPatients.where((p) => p.isActive).length;
  int get inactiveCount => _allPatients.where((p) => !p.isActive).length;

  /// Carga los pacientes desde la API/Mock y actualiza el estado
  Future<void> fetchPatients() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      debugPrint('🚀 [PatientsProvider.fetchPatients] Loading patients...');
      final fetched = await _patientService.getPatients();
      _allPatients = fetched;
      debugPrint('✅ [PatientsProvider.fetchPatients] Provider stored ${_allPatients.length} patients.');
      
      // Si tenemos un paciente seleccionado, actualizamos su referencia
      if (_selectedPatient != null) {
        try {
          _selectedPatient = _allPatients.firstWhere((p) => p.id == _selectedPatient!.id);
        } catch (_) {}
      }
    } catch (e) {
      _errorMessage = 'Ocurrió un error al cargar la lista de pacientes.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Obtiene un paciente por id y opcionalmente lo establece como seleccionado
  Future<PatientModel?> getPatientById(String id) async {
    try {
      final patient = await _patientService.getPatientById(id);
      if (patient != null) {
        _selectedPatient = patient;
        notifyListeners();
      }
      return patient;
    } catch (e) {
      _errorMessage = 'No se pudo obtener el expediente del paciente.';
      notifyListeners();
      return null;
    }
  }

  /// Guarda o actualiza un paciente (si id == null -> crea, de lo contrario actualiza)
  Future<bool> savePatient(Map<String, dynamic> data, {String? id}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      PatientModel resultPatient;
      if (id != null && id.isNotEmpty) {
        resultPatient = await _patientService.updatePatient(id, data);
      } else {
        resultPatient = await _patientService.createPatient(data);
      }

      _selectedPatient = resultPatient;
      await fetchPatients();
      return true;
    } catch (e) {
      _errorMessage = 'Error al guardar la información del paciente.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Actualiza la información de un paciente localmente y en el servidor
  Future<bool> updatePatient(PatientModel updatedPatient) async {
    final index = _allPatients.indexWhere((p) => p.id == updatedPatient.id);
    if (index != -1) {
      _allPatients[index] = updatedPatient;
    } else {
      _allPatients.add(updatedPatient);
    }
    if (_selectedPatient?.id == updatedPatient.id) {
      _selectedPatient = updatedPatient;
    }
    notifyListeners();

    try {
      final res = await _patientService.updatePatient(updatedPatient.id, updatedPatient.toJson());
      final updatedIndex = _allPatients.indexWhere((p) => p.id == res.id);
      if (updatedIndex != -1) {
        _allPatients[updatedIndex] = res;
      }
      if (_selectedPatient?.id == res.id) {
        _selectedPatient = res;
      }
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('⚠️ [PatientsProvider.updatePatient] API sync warning: $e');
      return true;
    }
  }

  /// Establece la consulta de búsqueda en tiempo real
  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  /// Establece el filtro por estado ('ALL', 'ACTIVE', 'INACTIVE')
  void setStatusFilter(String filter) {
    _statusFilter = filter;
    notifyListeners();
  }

  /// Selecciona un paciente para ver su ficha 360°
  void selectPatient(PatientModel? patient) {
    _selectedPatient = patient;
    notifyListeners();
  }

  /// Limpia cualquier mensaje de error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
