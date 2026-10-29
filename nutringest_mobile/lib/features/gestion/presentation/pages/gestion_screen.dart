import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/app_drawer.dart';
import '../../../patients/presentation/pages/patient_list_page.dart';
import '../../../patients/presentation/pages/patient_form_page.dart';
import '../../../patients/providers/patients_provider.dart';
import '../../../agenda/presentation/pages/agenda_calendar_screen.dart';

import '../../../../core/widgets/app_header_avatar.dart';

class GestionScreen extends StatelessWidget {
  const GestionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final patientsProvider = context.watch<PatientsProvider>();

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
              'Gestión Clínica & Agenda',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
        actions: const [
          AppHeaderAvatar(),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Management Sections Header
            Text(
              'ACCESOS PRINCIPALES',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
                color: AppTheme.accentPurple,
              ),
            ),
            const SizedBox(height: 12),

            // Card 1: Pacientes
            _buildManagementCard(
              context,
              title: 'Gestión de Pacientes',
              subtitle: 'Consulta la lista completa, historias clínicas y fichas 360°',
              icon: Icons.people_rounded,
              badgeText: '${patientsProvider.rawPatients.length} Activos',
              color: AppTheme.primaryPurple,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PatientListPage()),
                );
              },
            ),
            const SizedBox(height: 12),

            // Card 2: Nuevo Paciente
            _buildManagementCard(
              context,
              title: 'Nuevo Paciente',
              subtitle: 'Formulario de registro de nuevo expediente',
              icon: Icons.person_add_rounded,
              badgeText: 'Nuevo',
              color: AppTheme.accentPurple,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PatientFormPage()),
                );
              },
            ),
            const SizedBox(height: 12),

            // Card 3: Agenda & Consultas
            _buildManagementCard(
              context,
              title: 'Agenda de Citas & Consultas',
              subtitle: 'Organizador de turnos, recordatorios y seguimiento de fechas',
              icon: Icons.calendar_month_rounded,
              badgeText: 'Agenda',
              color: AppTheme.successGreen,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AgendaCalendarScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildManagementCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required String badgeText,
    required Color color,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.montserrat(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              badgeText,
                              style: GoogleFonts.montserrat(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: color,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        color: AppTheme.textSecondaryLight,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondaryLight),
            ],
          ),
        ),
      ),
    );
  }
}
