import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../models/appointment_model.dart';

enum AgendaViewMode { month, week, day }
enum AgendaFilterRange { today, thisWeek, thisMonth, all }

class AgendaProvider with ChangeNotifier {
  final ApiClient _apiClient;

  List<AppointmentModel> _appointments = [];
  DateTime _selectedDate = DateTime.now();
  AgendaViewMode _viewMode = AgendaViewMode.month;
  AgendaFilterRange _filterRange = AgendaFilterRange.thisMonth;
  AppointmentModel? _selectedAppointment;
  bool _isLoading = false;
  String? _errorMessage;

  AgendaProvider({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient() {
    fetchAppointments();
  }

  // Getters
  List<AppointmentModel> get appointments => _appointments;
  DateTime get selectedDate => _selectedDate;
  AgendaViewMode get viewMode => _viewMode;
  AgendaFilterRange get filterRange => _filterRange;
  AppointmentModel? get selectedAppointment => _selectedAppointment;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Retorna las citas filtradas por el rango activo o modo de vista actual
  List<AppointmentModel> get filteredAppointments {
    final now = _selectedDate;
    return _appointments.where((app) {
      if (_viewMode == AgendaViewMode.day) {
        return app.date.year == now.year &&
            app.date.month == now.month &&
            app.date.day == now.day;
      } else if (_viewMode == AgendaViewMode.week) {
        final firstDayOfWeek = now.subtract(Duration(days: now.weekday - 1));
        final startOfWeek = DateTime(firstDayOfWeek.year, firstDayOfWeek.month, firstDayOfWeek.day);
        final endOfWeek = startOfWeek.add(const Duration(days: 7));
        return app.date.isAfter(startOfWeek.subtract(const Duration(seconds: 1))) &&
            app.date.isBefore(endOfWeek);
      } else {
        // Month view
        return app.date.year == now.year && app.date.month == now.month;
      }
    }).toList()..sort((a, b) => a.date.compareTo(b.date));
  }

  /// Conteo de estadísticas del rango/vista actual
  int get totalScheduled => filteredAppointments.where((a) => a.isScheduled).length;
  int get completedCount => filteredAppointments.where((a) => a.isCompleted).length;
  int get pendingCount => filteredAppointments.where((a) => a.isPending).length;
  int get cancelledCount => filteredAppointments.where((a) => a.isCancelled).length;
  int get totalCount => filteredAppointments.length;

  /// Obtiene citas para un día específico
  List<AppointmentModel> getAppointmentsForDay(DateTime day) {
    return _appointments.where((app) =>
        app.date.year == day.year &&
        app.date.month == day.month &&
        app.date.day == day.day
    ).toList()..sort((a, b) => a.date.compareTo(b.date));
  }

  /// Citas para un paciente específico
  List<AppointmentModel> getAppointmentsForPatient(String patientId) {
    return _appointments.where((app) => app.patientId == patientId).toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  /// Cargar citas desde el backend API (/api/consultations)
  Future<void> fetchAppointments() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.get('/consultations');
      if (response.statusCode == 200 && response.data != null) {
        final dynamic rawData = response.data;
        List<dynamic> items = [];

        if (rawData is List) {
          items = rawData;
        } else if (rawData is Map<String, dynamic>) {
          if (rawData['list'] is List) {
            items = rawData['list'];
          } else if (rawData['data'] is List) {
            items = rawData['data'];
          } else if (rawData['items'] is List) {
            items = rawData['items'];
          } else if (rawData['results'] is List) {
            items = rawData['results'];
          }
        }

        _appointments = items
            .map((item) => AppointmentModel.fromJson(item as Map<String, dynamic>))
            .toList();
        _appointments.sort((a, b) => a.date.compareTo(b.date));
      } else {
        _appointments = [];
      }
    } catch (e) {
      _appointments = [];
      _errorMessage = 'Error al cargar las citas del servidor';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crear nueva cita
  void createAppointment({
    required String patientId,
    required String patientName,
    String? patientDni,
    String? patientAvatar,
    required DateTime date,
    int durationMinutes = 45,
    String status = 'SCHEDULED',
    String modality = 'PRESENCIAL',
    String type = 'CONTROL',
    String? notes,
    double? price,
  }) {
    final newApt = AppointmentModel(
      id: 'apt-${DateTime.now().millisecondsSinceEpoch}',
      patientId: patientId,
      patientName: patientName,
      patientDni: patientDni,
      patientAvatar: patientAvatar,
      date: date,
      durationMinutes: durationMinutes,
      status: status,
      modality: modality,
      type: type,
      notes: notes,
      price: price ?? 15000.0,
    );

    _appointments.add(newApt);
    _appointments.sort((a, b) => a.date.compareTo(b.date));
    notifyListeners();
  }

  /// Actualizar estado de una cita (SCHEDULED, COMPLETED, CANCELLED, PENDING)
  void updateStatus(String appointmentId, String newStatus) {
    final index = _appointments.indexWhere((a) => a.id == appointmentId);
    if (index != -1) {
      _appointments[index] = _appointments[index].copyWith(status: newStatus);
      if (_selectedAppointment?.id == appointmentId) {
        _selectedAppointment = _appointments[index];
      }
      notifyListeners();
    }
  }

  /// Actualizar cita completa
  void updateAppointment(AppointmentModel updated) {
    final index = _appointments.indexWhere((a) => a.id == updated.id);
    if (index != -1) {
      _appointments[index] = updated;
      _appointments.sort((a, b) => a.date.compareTo(b.date));
      notifyListeners();
    }
  }

  /// Cambiar modo de vista (Mes, Semana, Día)
  void setViewMode(AgendaViewMode mode) {
    _viewMode = mode;
    notifyListeners();
  }

  /// Cambiar fecha seleccionada
  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  /// Cambiar rango de filtro
  void setFilterRange(AgendaFilterRange range) {
    _filterRange = range;
    notifyListeners();
  }

  /// Seleccionar cita
  void setSelectedAppointment(AppointmentModel? appointment) {
    _selectedAppointment = appointment;
    notifyListeners();
  }
}
