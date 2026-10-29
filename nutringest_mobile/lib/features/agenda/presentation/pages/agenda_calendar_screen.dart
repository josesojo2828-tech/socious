import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/app_drawer.dart';
import '../../../patients/models/patient_model.dart';
import '../../../patients/providers/patients_provider.dart';
import '../../../patients/presentation/pages/patient_detail_360_page.dart';
import '../../models/appointment_model.dart';
import '../../providers/agenda_provider.dart';
import '../widgets/schedule_appointment_modal.dart';

class AgendaCalendarScreen extends StatefulWidget {
  final DateTime? targetDate;

  const AgendaCalendarScreen({super.key, this.targetDate});

  @override
  State<AgendaCalendarScreen> createState() => _AgendaCalendarScreenState();
}

class _AgendaCalendarScreenState extends State<AgendaCalendarScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.targetDate != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<AgendaProvider>().setSelectedDate(widget.targetDate!);
      });
    }
  }

  String _formatMonthYear(DateTime date) {
    final months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }

  String _formatWeekRange(DateTime date) {
    final firstDayOfWeek = date.subtract(Duration(days: date.weekday - 1));
    final endOfWeek = firstDayOfWeek.add(const Duration(days: 6));
    final months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return '${firstDayOfWeek.day} ${months[firstDayOfWeek.month - 1]} - ${endOfWeek.day} ${months[endOfWeek.month - 1]} ${endOfWeek.year}';
  }

  String _formatDayFull(DateTime date) {
    final days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    final months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return '${days[date.weekday - 1]} ${date.day} de ${months[date.month - 1]}';
  }

  String _formatTimeRange(DateTime start, int durationMinutes) {
    final end = start.add(Duration(minutes: durationMinutes));
    final h1 = start.hour.toString().padLeft(2, '0');
    final m1 = start.minute.toString().padLeft(2, '0');
    final h2 = end.hour.toString().padLeft(2, '0');
    final m2 = end.minute.toString().padLeft(2, '0');
    return '$h1:$m1 hs - $h2:$m2 hs ($durationMinutes min)';
  }

  void _navigateToPatientDetail(String patientId, String patientName) {
    final patientsProvider = context.read<PatientsProvider>();
    final found = patientsProvider.rawPatients.firstWhere(
      (p) => p.id == patientId,
      orElse: () => PatientModel(
        id: patientId,
        firstName: patientName.split(' ').first,
        lastName: patientName.contains(' ') ? patientName.split(' ').sublist(1).join(' ') : '',
        status: 'ACTIVE',
      ),
    );

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PatientDetail360Page(patient: found),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return AppTheme.successGreen;
      case 'SCHEDULED':
        return AppTheme.primaryPurple;
      case 'PENDING':
        return Colors.amber[800]!;
      case 'CANCELLED':
        return AppTheme.errorRed;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return Icons.check_circle_rounded;
      case 'SCHEDULED':
        return Icons.event_available_rounded;
      case 'PENDING':
        return Icons.hourglass_top_rounded;
      case 'CANCELLED':
        return Icons.cancel_rounded;
      default:
        return Icons.event;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final agenda = context.watch<AgendaProvider>();
    final selectedDate = agenda.selectedDate;

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 1),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'MÓDULO DE GESTIÓN',
              style: GoogleFonts.montserrat(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: AppTheme.accentPurple,
              ),
            ),
            Text(
              'Agenda & Calendario',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.today_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Ir a Hoy',
            onPressed: () {
              agenda.setSelectedDate(DateTime.now());
            },
          ),
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Agendar Cita',
            onPressed: () async {
              final result = await ScheduleAppointmentModal.show(
                context,
                initialDate: agenda.selectedDate,
              );
              if (!context.mounted) return;
              if (result == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Cita agendada correctamente en la agenda.'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. View Mode Segmented Control (Mes | Semana | Día)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
            child: Row(
              children: [
                Expanded(
                  child: _buildSegmentButton(
                    label: 'Mes',
                    mode: AgendaViewMode.month,
                    currentMode: agenda.viewMode,
                    onTap: () => agenda.setViewMode(AgendaViewMode.month),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildSegmentButton(
                    label: 'Semana',
                    mode: AgendaViewMode.week,
                    currentMode: agenda.viewMode,
                    onTap: () => agenda.setViewMode(AgendaViewMode.week),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildSegmentButton(
                    label: 'Día',
                    mode: AgendaViewMode.day,
                    currentMode: agenda.viewMode,
                    onTap: () => agenda.setViewMode(AgendaViewMode.day),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // 2. Date Range Navigator (Prev / Title / Next)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: isDark ? AppTheme.bgDark : AppTheme.softPurpleChip,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded, size: 28),
                  onPressed: () {
                    if (agenda.viewMode == AgendaViewMode.month) {
                      agenda.setSelectedDate(DateTime(selectedDate.year, selectedDate.month - 1, selectedDate.day));
                    } else if (agenda.viewMode == AgendaViewMode.week) {
                      agenda.setSelectedDate(selectedDate.subtract(const Duration(days: 7)));
                    } else {
                      agenda.setSelectedDate(selectedDate.subtract(const Duration(days: 1)));
                    }
                  },
                ),
                Expanded(
                  child: Text(
                    agenda.viewMode == AgendaViewMode.month
                        ? _formatMonthYear(selectedDate)
                        : agenda.viewMode == AgendaViewMode.week
                            ? _formatWeekRange(selectedDate)
                            : _formatDayFull(selectedDate),
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryPurple,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded, size: 28),
                  onPressed: () {
                    if (agenda.viewMode == AgendaViewMode.month) {
                      agenda.setSelectedDate(DateTime(selectedDate.year, selectedDate.month + 1, selectedDate.day));
                    } else if (agenda.viewMode == AgendaViewMode.week) {
                      agenda.setSelectedDate(selectedDate.add(const Duration(days: 7)));
                    } else {
                      agenda.setSelectedDate(selectedDate.add(const Duration(days: 1)));
                    }
                  },
                ),
              ],
            ),
          ),

          // 3. Statistics Summary Cards Grid (4 KPIs)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth < 320) {
                  final cardWidth = (constraints.maxWidth - 8) / 2;
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      SizedBox(
                        width: cardWidth,
                        child: _buildKpiCard(
                          label: 'Agendadas',
                          count: agenda.totalScheduled,
                          color: AppTheme.primaryPurple,
                          icon: Icons.event_available_rounded,
                        ),
                      ),
                      SizedBox(
                        width: cardWidth,
                        child: _buildKpiCard(
                          label: 'Cumplidas',
                          count: agenda.completedCount,
                          color: AppTheme.successGreen,
                          icon: Icons.check_circle_rounded,
                        ),
                      ),
                      SizedBox(
                        width: cardWidth,
                        child: _buildKpiCard(
                          label: 'Pendientes',
                          count: agenda.pendingCount,
                          color: Colors.amber[800]!,
                          icon: Icons.hourglass_top_rounded,
                        ),
                      ),
                      SizedBox(
                        width: cardWidth,
                        child: _buildKpiCard(
                          label: 'Canceladas',
                          count: agenda.cancelledCount,
                          color: AppTheme.errorRed,
                          icon: Icons.cancel_rounded,
                        ),
                      ),
                    ],
                  );
                }
                return Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        label: 'Agendadas',
                        count: agenda.totalScheduled,
                        color: AppTheme.primaryPurple,
                        icon: Icons.event_available_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildKpiCard(
                        label: 'Cumplidas',
                        count: agenda.completedCount,
                        color: AppTheme.successGreen,
                        icon: Icons.check_circle_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildKpiCard(
                        label: 'Pendientes',
                        count: agenda.pendingCount,
                        color: Colors.amber[800]!,
                        icon: Icons.hourglass_top_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildKpiCard(
                        label: 'Canceladas',
                        count: agenda.cancelledCount,
                        color: AppTheme.errorRed,
                        icon: Icons.cancel_rounded,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // 4. Main Body: Calendar Grid (Month Mode) or Timeline List (Week & Day Mode)
          Expanded(
            child: agenda.viewMode == AgendaViewMode.month
                ? _buildMonthView(context, agenda)
                : _buildTimelineView(context, agenda),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryPurple,
        foregroundColor: Colors.white,
        onPressed: () async {
          final result = await ScheduleAppointmentModal.show(
            context,
            initialDate: agenda.selectedDate,
          );
          if (!context.mounted) return;
          if (result == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Nueva cita agregada exitosamente.'),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        icon: const Icon(Icons.add_rounded),
        label: Text(
          '+ Agendar Cita',
          style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ),
    );
  }

  // ==========================================
  // SEGMENT BUTTON BUILDER
  // ==========================================
  Widget _buildSegmentButton({
    required String label,
    required AgendaViewMode mode,
    required AgendaViewMode currentMode,
    required VoidCallback onTap,
  }) {
    final isSelected = mode == currentMode;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryPurple : (isDark ? AppTheme.bgDark : Colors.grey[100]),
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // KPI CARD BUILDER
  // ==========================================
  Widget _buildKpiCard({
    required String label,
    required int count,
    required Color color,
    required IconData icon,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 2),
              Flexible(
                child: Text(
                  '$count',
                  style: GoogleFonts.montserrat(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondaryLight,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 1. MONTH VIEW (CALENDAR GRID + DAY LIST)
  // ==========================================
  Widget _buildMonthView(BuildContext context, AgendaProvider agenda) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final selected = agenda.selectedDate;
    final firstDayOfMonth = DateTime(selected.year, selected.month, 1);
    final lastDayOfMonth = DateTime(selected.year, selected.month + 1, 0);

    final startingWeekday = firstDayOfMonth.weekday; // 1 = Lun, 7 = Dom
    final totalDays = lastDayOfMonth.day;

    final weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    final selectedDayAppointments = agenda.getAppointmentsForDay(selected);

    return Column(
      children: [
        // Days of week header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          color: isDark ? AppTheme.cardDark : Colors.grey[100],
          child: Row(
            children: weekDays.map((d) {
              return Expanded(
                child: Text(
                  d,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryPurple,
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        // Grid of Days
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            childAspectRatio: 1.3,
            crossAxisSpacing: 4,
            mainAxisSpacing: 4,
          ),
          itemCount: (startingWeekday - 1) + totalDays,
          itemBuilder: (context, index) {
            if (index < startingWeekday - 1) {
              return const SizedBox.shrink();
            }

            final dayNumber = index - (startingWeekday - 1) + 1;
            final cellDate = DateTime(selected.year, selected.month, dayNumber);

            final isSelected = cellDate.year == selected.year &&
                cellDate.month == selected.month &&
                cellDate.day == selected.day;

            final today = DateTime.now();
            final isToday = cellDate.year == today.year &&
                cellDate.month == today.month &&
                cellDate.day == today.day;

            final dayAppointments = agenda.getAppointmentsForDay(cellDate);
            final hasEvents = dayAppointments.isNotEmpty;

            return InkWell(
              onTap: () {
                agenda.setSelectedDate(cellDate);
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppTheme.primaryPurple
                      : (isToday ? AppTheme.softPurpleChip : (isDark ? AppTheme.cardDark : Colors.white)),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected
                        ? AppTheme.primaryPurple
                        : (isToday ? AppTheme.accentPurple : (isDark ? AppTheme.borderDark : Colors.grey[200]!)),
                    width: isSelected || isToday ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$dayNumber',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: isSelected || isToday ? FontWeight.bold : FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : (isDark ? Colors.white : theme.colorScheme.onSurface),
                      ),
                    ),
                    if (hasEvents)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: dayAppointments.take(3).map((apt) {
                          return Container(
                            margin: const EdgeInsets.only(left: 1, right: 1, top: 2),
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white : _getStatusColor(apt.status),
                              shape: BoxShape.circle,
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
        const Divider(height: 1),

        // Selected Day Appointments List Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'CITAS DEL DÍA ${selected.day}/${selected.month} (${selectedDayAppointments.length})',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                    color: AppTheme.textSecondaryLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => agenda.setViewMode(AgendaViewMode.day),
                child: Text(
                  'Ver Vista Día →',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryPurple,
                  ),
                ),
              ),
            ],
          ),
        ),

        // List of Appointments for Selected Day
        Expanded(
          child: selectedDayAppointments.isEmpty
              ? _buildEmptyState(
                  context,
                  icon: Icons.event_available_rounded,
                  message: 'No hay citas agendadas para esta fecha',
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  itemCount: selectedDayAppointments.length,
                  itemBuilder: (context, index) {
                    final appointment = selectedDayAppointments[index];
                    return _buildAppointmentCard(context, appointment, agenda);
                  },
                ),
        ),
      ],
    );
  }

  // ==========================================
  // 2. TIMELINE VIEW (WEEK & DAY MODE)
  // ==========================================
  Widget _buildTimelineView(BuildContext context, AgendaProvider agenda) {
    final appointments = agenda.filteredAppointments;

    if (appointments.isEmpty) {
      return _buildEmptyState(
        context,
        icon: Icons.calendar_month_outlined,
        message: 'No hay citas agendadas para esta fecha',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      itemCount: appointments.length,
      itemBuilder: (context, index) {
        final appointment = appointments[index];
        return _buildAppointmentCard(context, appointment, agenda);
      },
    );
  }

  // ==========================================
  // APPOINTMENT CARD ITEM
  // ==========================================
  Widget _buildAppointmentCard(
    BuildContext context,
    AppointmentModel appointment,
    AgendaProvider agenda,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final statusColor = _getStatusColor(appointment.status);
    final statusIcon = _getStatusIcon(appointment.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: InkWell(
        onTap: () {
          _showAppointmentDetailBottomSheet(context, appointment, agenda);
        },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar: Horario, Duración, Modalia & Status Badge
              Row(
                children: [
                  Icon(
                    appointment.isPresencial ? Icons.domain_rounded : Icons.videocam_rounded,
                    size: 16,
                    color: AppTheme.primaryPurple,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      _formatTimeRange(appointment.date, appointment.durationMinutes),
                      style: GoogleFonts.montserrat(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryPurple,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),

                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 12, color: statusColor),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            appointment.statusLabel,
                            style: GoogleFonts.montserrat(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 16),

              // Patient Info Row (Tapping navigates to PatientDetail360Page)
              InkWell(
                onTap: () {
                  _navigateToPatientDetail(appointment.patientId, appointment.patientName);
                },
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: AppTheme.primaryPurple.withValues(alpha: 0.15),
                        child: Text(
                          appointment.patientName.isNotEmpty
                              ? appointment.patientName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
                              : 'P',
                          style: GoogleFonts.montserrat(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryPurple,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              appointment.patientName,
                              style: GoogleFonts.montserrat(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.onSurface,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'DNI: ${appointment.patientDni ?? "S/D"}  •  ${appointment.isPresencial ? "Presencial en consultorio" : "Atención Online"}',
                              style: GoogleFonts.montserrat(
                                fontSize: 11,
                                color: AppTheme.textSecondaryLight,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textSecondaryLight),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // Type pill + Notes
              Row(
                children: [
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.softPurpleChip,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        appointment.typeLabel,
                        style: GoogleFonts.montserrat(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryPurple,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  if (appointment.price != null) ...[
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        '\$${appointment.price!.round()} ARS',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondaryLight,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),

              if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Motivo: ${appointment.notes!}',
                  style: GoogleFonts.montserrat(
                    fontSize: 11.5,
                    fontStyle: FontStyle.italic,
                    color: AppTheme.textSecondaryLight,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // APPOINTMENT OPTIONS / DETAIL BOTTOM SHEET
  // ==========================================
  void _showAppointmentDetailBottomSheet(
    BuildContext context,
    AppointmentModel appointment,
    AgendaProvider agenda,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppTheme.primaryPurple.withValues(alpha: 0.15),
                    child: Text(
                      appointment.patientName.isNotEmpty
                          ? appointment.patientName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
                          : 'P',
                      style: GoogleFonts.montserrat(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primaryPurple),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appointment.patientName,
                          style: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${appointment.typeLabel} • ${appointment.statusLabel}',
                          style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              Text(
                'CAMBIAR ESTADO DE LA CITA:',
                style: GoogleFonts.montserrat(
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: AppTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _buildStatusOptionTile(
                      context,
                      label: 'Agendada',
                      icon: Icons.event_available_rounded,
                      color: AppTheme.primaryPurple,
                      isSelected: appointment.isScheduled,
                      onTap: () {
                        agenda.updateStatus(appointment.id, 'SCHEDULED');
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatusOptionTile(
                      context,
                      label: 'Cumplida',
                      icon: Icons.check_circle_rounded,
                      color: AppTheme.successGreen,
                      isSelected: appointment.isCompleted,
                      onTap: () {
                        agenda.updateStatus(appointment.id, 'COMPLETED');
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildStatusOptionTile(
                      context,
                      label: 'Pendiente',
                      icon: Icons.hourglass_top_rounded,
                      color: Colors.amber[800]!,
                      isSelected: appointment.isPending,
                      onTap: () {
                        agenda.updateStatus(appointment.id, 'PENDING');
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatusOptionTile(
                      context,
                      label: 'Cancelada',
                      icon: Icons.cancel_rounded,
                      color: AppTheme.errorRed,
                      isSelected: appointment.isCancelled,
                      onTap: () {
                        agenda.updateStatus(appointment.id, 'CANCELLED');
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Navigate to patient 360 link
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryPurple,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.of(context).pop();
                  _navigateToPatientDetail(appointment.patientId, appointment.patientName);
                },
                icon: const Icon(Icons.person_pin_rounded, size: 18),
                label: Text(
                  'Ver Expediente 360° del Paciente',
                  style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatusOptionTile(
    BuildContext context, {
    required String label,
    required IconData icon,
    required Color color,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? color : AppTheme.textSecondaryLight,
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

  // ==========================================
  // EMPTY STATE WIDGET
  // ==========================================
  Widget _buildEmptyState(
    BuildContext context, {
    required IconData icon,
    required String message,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: SingleChildScrollView(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 32, color: AppTheme.primaryPurple),
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryPurple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () async {
                  final agenda = context.read<AgendaProvider>();
                  final result = await ScheduleAppointmentModal.show(
                    context,
                    initialDate: agenda.selectedDate,
                  );
                  if (!context.mounted) return;
                  if (result == true) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Nueva cita agregada exitosamente.'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(
                  '+ Agendar Cita',
                  style: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
