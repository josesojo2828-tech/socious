import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/pages/profile_page.dart';
import '../../models/patient_model.dart';
import '../../providers/patients_provider.dart';
import 'patient_detail_360_page.dart';
import 'patient_form_page.dart';
import '../../../calculators/presentation/pages/tmb_get_calculator_page.dart';
import '../../../calculators/presentation/pages/food_waste_calculator_page.dart';
import '../../../../core/navigation/app_drawer.dart';

class PatientListPage extends StatefulWidget {
  const PatientListPage({super.key});

  @override
  State<PatientListPage> createState() => _PatientListPageState();
}

class _PatientListPageState extends State<PatientListPage> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<PatientsProvider>();
      if (provider.rawPatients.isEmpty) {
        provider.fetchPatients();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openWhatsApp(String url) async {
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El paciente no tiene un número de teléfono válido.')),
      );
      return;
    }
    final uri = Uri.parse(url);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir WhatsApp en este dispositivo.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al intentar abrir el chat de WhatsApp.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<PatientsProvider>();
    final patientsList = provider.patients;

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 0),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'EXPEDIENTES',
              style: GoogleFonts.montserrat(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: AppTheme.accentPurple,
              ),
            ),
            Text(
              'Gestión de Pacientes',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.calculate_outlined, color: AppTheme.primaryPurple),
            tooltip: 'Calculadoras Express',
            onSelected: (value) {
              if (value == 'tmb') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const TmbGetCalculatorPage()),
                );
              } else if (value == 'waste') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const FoodWasteCalculatorPage()),
                );
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'tmb',
                child: Row(
                  children: [
                    const Icon(Icons.calculate_rounded, color: AppTheme.primaryPurple, size: 20),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        'Calculadora TMB & GET',
                        style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'waste',
                child: Row(
                  children: [
                    const Icon(Icons.pie_chart_outline, color: AppTheme.accentPurple, size: 20),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        'Merma & Rendimiento',
                        style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined, size: 26),
            tooltip: 'Mi Perfil Profesional',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 24),
            tooltip: 'Actualizar Lista',
            onPressed: () => provider.fetchPatients(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Header Search Section (Kombai design var_36ee35ed4bbf)
          Container(
            color: theme.appBarTheme.backgroundColor,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              children: [
                // Buscador en tiempo real
                TextField(
                  controller: _searchController,
                  onChanged: (val) => provider.setSearchQuery(val),
                  decoration: InputDecoration(
                    hintText: 'Buscar por nombre, DNI o motivo...',
                    prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.primaryPurple),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 20),
                            onPressed: () {
                              _searchController.clear();
                              provider.setSearchQuery('');
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12),

                // Chips de Filtro (Todos, Activos, Inactivos)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(
                        label: 'Todos',
                        count: provider.totalCount,
                        filterValue: 'ALL',
                        selectedFilter: provider.statusFilter,
                        onSelected: () => provider.setStatusFilter('ALL'),
                      ),
                      const SizedBox(width: 8),
                      _buildFilterChip(
                        label: 'Activos',
                        count: provider.activeCount,
                        filterValue: 'ACTIVE',
                        selectedFilter: provider.statusFilter,
                        onSelected: () => provider.setStatusFilter('ACTIVE'),
                      ),
                      const SizedBox(width: 8),
                      _buildFilterChip(
                        label: 'Inactivos',
                        count: provider.inactiveCount,
                        filterValue: 'INACTIVE',
                        selectedFilter: provider.statusFilter,
                        onSelected: () => provider.setStatusFilter('INACTIVE'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Error Banner
          if (provider.errorMessage != null)
            Container(
              width: double.infinity,
              color: AppTheme.errorRed.withValues(alpha: 0.1),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: AppTheme.errorRed, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      provider.errorMessage!,
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        color: AppTheme.errorRed,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16, color: AppTheme.errorRed),
                    onPressed: () => provider.clearError(),
                  ),
                ],
              ),
            ),

          // Patients List Container
          Expanded(
            child: provider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryPurple),
                    ),
                  )
                : patientsList.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: () => provider.fetchPatients(),
                        color: AppTheme.primaryPurple,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: patientsList.length,
                          itemBuilder: (context, index) {
                            final patient = patientsList[index];
                            return _buildPatientCard(patient);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryPurple,
        foregroundColor: Colors.white,
        elevation: 3,
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const PatientFormPage()),
          );
          if (result == true && mounted) {
            provider.fetchPatients();
          }
        },
        icon: const Icon(Icons.person_add_rounded),
        label: Text(
          'Nuevo Paciente',
          style: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required int count,
    required String filterValue,
    required String selectedFilter,
    required VoidCallback onSelected,
  }) {
    final isSelected = selectedFilter == filterValue;
    return ChoiceChip(
      showCheckmark: false,
      label: Text('$label ($count)'),
      labelStyle: GoogleFonts.montserrat(
        fontSize: 12.5,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : AppTheme.textPrimaryLight,
      ),
      selected: isSelected,
      selectedColor: AppTheme.primaryPurple,
      backgroundColor: AppTheme.softPurpleChip,
      side: BorderSide(
        color: isSelected ? AppTheme.primaryPurple : AppTheme.borderLight,
      ),
      onSelected: (_) => onSelected(),
    );
  }

  Widget _buildPatientCard(PatientModel patient) {
    final theme = Theme.of(context);
    final ageStr = patient.age != null ? '${patient.age} años' : 'Edad N/D';

    String lastConsultStr = 'Sin consultas registradas';
    if (patient.lastConsultationDate != null) {
      final d = patient.lastConsultationDate!;
      final months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      lastConsultStr = '${d.day} ${months[d.month - 1]} ${d.year}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            context.read<PatientsProvider>().selectPatient(patient);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => PatientDetail360Page(patient: patient),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Avatar con iniciales en gradiente purpura (Kombai design)
                    Container(
                      width: 50,
                      height: 50,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [AppTheme.primaryPurple, AppTheme.accentPurple],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          patient.initials,
                          style: GoogleFonts.montserrat(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Nombre, Edad y Badge de Estado
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  patient.fullName,
                                  style: GoogleFonts.montserrat(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: patient.isActive
                                      ? AppTheme.successGreen.withValues(alpha: 0.12)
                                      : Colors.grey.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  patient.isActive ? 'ACTIVO' : 'INACTIVO',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: patient.isActive ? AppTheme.successGreen : Colors.grey[700],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  ageStr,
                                  style: GoogleFonts.montserrat(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.textSecondaryLight,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (patient.dni != null && patient.dni!.isNotEmpty) ...[
                                Expanded(
                                  child: Text(
                                    '  •  DNI ${patient.dni}',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 12.5,
                                      color: AppTheme.textSecondaryLight,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          if ((patient.ownerName != null && patient.ownerName!.isNotEmpty) || patient.teamCount > 1) ...[
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                if (patient.ownerName != null && patient.ownerName!.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF8E1),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.5)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text('👑', style: TextStyle(fontSize: 11)),
                                        const SizedBox(width: 4),
                                        Flexible(
                                          child: Text(
                                            'Propietario: ${patient.ownerName}',
                                            style: GoogleFonts.montserrat(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.bold,
                                              color: const Color(0xFFB78103),
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (patient.teamCount > 1)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEEF2FF),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFC7D2FE)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.group_rounded, size: 12, color: Color(0xFF4F46E5)),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Equipo (${patient.teamCount})',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF4F46E5),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                const Divider(height: 1, color: AppTheme.borderLight),
                const SizedBox(height: 10),

                // Objetivo del paciente
                if (patient.objective != null && patient.objective!.isNotEmpty) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.track_changes_rounded,
                        size: 16,
                        color: AppTheme.accentPurple,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          patient.objective!,
                          style: GoogleFonts.montserrat(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],

                // Footer Card: Última consulta & Botón de WhatsApp
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.calendar_today_rounded,
                          size: 14,
                          color: AppTheme.textSecondaryLight,
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            'Última consulta: $lastConsultStr',
                            style: GoogleFonts.montserrat(
                              fontSize: 11.5,
                              color: AppTheme.textSecondaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),

                    // Botón de WhatsApp direct
                    InkWell(
                      onTap: () => _openWhatsApp(patient.whatsappUrl),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF25D366).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF25D366).withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 14,
                              color: Color(0xFF128C7E),
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                'WhatsApp',
                                style: GoogleFonts.montserrat(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF128C7E),
                                ),
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: AppTheme.softPurpleChip,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person_search_rounded,
                size: 40,
                color: AppTheme.primaryPurple,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Sin resultados de pacientes',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'No se encontraron expedientes que coincidan con la búsqueda o el filtro seleccionado.',
              style: GoogleFonts.montserrat(
                fontSize: 13,
                color: AppTheme.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () {
                _searchController.clear();
                context.read<PatientsProvider>().setSearchQuery('');
                context.read<PatientsProvider>().setStatusFilter('ALL');
              },
              icon: const Icon(Icons.cleaning_services_rounded, size: 18),
              label: const Text('Restablecer Filtros'),
            ),
          ],
        ),
      ),
    );
  }
}
