import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../../patients/providers/patients_provider.dart';
import '../../providers/agenda_provider.dart';

class ScheduleAppointmentModal extends StatefulWidget {
  final PatientModel? preselectedPatient;
  final DateTime? initialDate;

  const ScheduleAppointmentModal({
    super.key,
    this.preselectedPatient,
    this.initialDate,
  });

  static Future<bool?> show(
    BuildContext context, {
    PatientModel? preselectedPatient,
    DateTime? initialDate,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ScheduleAppointmentModal(
        preselectedPatient: preselectedPatient,
        initialDate: initialDate,
      ),
    );
  }

  @override
  State<ScheduleAppointmentModal> createState() => _ScheduleAppointmentModalState();
}

class _ScheduleAppointmentModalState extends State<ScheduleAppointmentModal> {
  final _formKey = GlobalKey<FormState>();

  PatientModel? _selectedPatient;
  late DateTime _selectedDate;
  late TimeOfDay _selectedTime;
  int _durationMinutes = 45;
  String _modality = 'PRESENCIAL'; // 'PRESENCIAL' | 'ONLINE'
  String _type = 'CONTROL'; // 'INICIAL' | 'CONTROL' | 'ISAK' | 'SEGUIMIENTO'
  late TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _selectedPatient = widget.preselectedPatient;

    final initial = widget.initialDate ?? DateTime.now();
    _selectedDate = DateTime(initial.year, initial.month, initial.day);
    _selectedTime = TimeOfDay(hour: initial.hour == 0 ? 10 : initial.hour, minute: 0);

    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    final months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    final days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return '${days[date.weekday - 1]} ${date.day} ${months[date.month - 1]} ${date.year}';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppTheme.primaryPurple,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppTheme.primaryPurple,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  void _submitForm() {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedPatient == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor, seleccioná un paciente para la cita.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final appointmentDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );

    context.read<AgendaProvider>().createAppointment(
          patientId: _selectedPatient!.id,
          patientName: _selectedPatient!.fullName,
          patientDni: _selectedPatient!.dni,
          patientAvatar: _selectedPatient!.avatarUrl,
          date: appointmentDateTime,
          durationMinutes: _durationMinutes,
          status: 'SCHEDULED',
          modality: _modality,
          type: _type,
          notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
        );

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final patientsProvider = context.watch<PatientsProvider>();
    final patients = patientsProvider.rawPatients;

    // Si no hay seleccionado y hay lista, preseleccionar primero
    if (_selectedPatient == null && patients.isNotEmpty) {
      _selectedPatient = patients.first;
    }

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        left: 20,
        right: 20,
        top: 16,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle drag indicator
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.borderDark : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Modal Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.calendar_month_rounded, color: AppTheme.primaryPurple, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Agendar Nueva Cita',
                          style: GoogleFonts.montserrat(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        Text(
                          'Completá los datos del turno de consulta',
                          style: GoogleFonts.montserrat(
                            fontSize: 12,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 1. Selector de Paciente
              Text(
                'PACIENTE',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: AppTheme.primaryPurple,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.bgDark : Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<PatientModel>(
                    value: _selectedPatient,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.primaryPurple),
                    items: patients.map((patient) {
                      return DropdownMenuItem<PatientModel>(
                        value: patient,
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: AppTheme.primaryPurple.withValues(alpha: 0.2),
                              child: Text(
                                patient.initials,
                                style: GoogleFonts.montserrat(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryPurple,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '${patient.fullName} (DNI ${patient.dni ?? "S/D"})',
                                style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: widget.preselectedPatient != null
                        ? null // Si vino preseleccionado, deshabilitar o mantener fijo
                        : (val) {
                            if (val != null) {
                              setState(() => _selectedPatient = val);
                            }
                          },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 2. Fecha y Hora
              Row(
                children: [
                  // Fecha
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'FECHA DE CITA',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickDate,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              color: isDark ? AppTheme.bgDark : Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.event_outlined, size: 18, color: AppTheme.primaryPurple),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _formatDate(_selectedDate),
                                    style: GoogleFonts.montserrat(fontSize: 12.5, fontWeight: FontWeight.w600),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Hora
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'HORARIO',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickTime,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              color: isDark ? AppTheme.bgDark : Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.access_time_rounded, size: 18, color: AppTheme.primaryPurple),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    _selectedTime.format(context),
                                    style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Modalidad y Duración
              Row(
                children: [
                  // Modalidad
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MODALIDAD',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Expanded(
                              child: _buildModalityButton(
                                label: 'Presencial',
                                icon: Icons.domain_rounded,
                                value: 'PRESENCIAL',
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildModalityButton(
                                label: 'Online',
                                icon: Icons.videocam_rounded,
                                value: 'ONLINE',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 4. Tipo de Consulta & Duración
              Row(
                children: [
                  // Tipo
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TIPO DE CONSULTA',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.bgDark : Colors.grey[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _type,
                              isExpanded: true,
                              items: const [
                                DropdownMenuItem(value: 'INICIAL', child: Text('Consulta Inicial')),
                                DropdownMenuItem(value: 'CONTROL', child: Text('Control Nutricional')),
                                DropdownMenuItem(value: 'ISAK', child: Text('Evaluación ISAK')),
                                DropdownMenuItem(value: 'SEGUIMIENTO', child: Text('Seguimiento')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _type = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Duración
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'DURACIÓN ESTIMADA',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.bgDark : Colors.grey[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<int>(
                              value: _durationMinutes,
                              isExpanded: true,
                              items: const [
                                DropdownMenuItem(value: 30, child: Text('30 minutos')),
                                DropdownMenuItem(value: 45, child: Text('45 minutos')),
                                DropdownMenuItem(value: 60, child: Text('60 minutos')),
                                DropdownMenuItem(value: 90, child: Text('90 minutos')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _durationMinutes = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 5. Motivo de Consulta
              Text(
                'MOTIVO DE CONSULTA',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: AppTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 6),

              TextFormField(
                controller: _notesController,
                maxLines: 2,
                style: GoogleFonts.montserrat(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Notas / Motivo de consulta (opcional)',
                  labelStyle: GoogleFonts.montserrat(fontSize: 12),
                  hintText: 'Ej. Traer estudios de sangre actualizados y diario dietético',
                  hintStyle: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        side: BorderSide(color: isDark ? AppTheme.borderDark : AppTheme.borderLight),
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Cancelar',
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                      onPressed: _submitForm,
                      icon: const Icon(Icons.check_circle_rounded, size: 18),
                      label: Text(
                        'Confirmar Cita',
                        style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModalityButton({
    required String label,
    required IconData icon,
    required String value,
  }) {
    final isSelected = _modality == value;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: () {
        setState(() => _modality = value);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryPurple
              : (isDark ? AppTheme.bgDark : Colors.grey[50]),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryPurple : (isDark ? AppTheme.borderDark : AppTheme.borderLight),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : AppTheme.primaryPurple,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
