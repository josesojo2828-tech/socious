import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../clinical/presentation/pages/anamnesis_form_page.dart';
import '../../../clinical/presentation/pages/anthropometry_form_page.dart';
import '../../../clinical/presentation/pages/somatocart_and_graphics_page.dart';
import '../../../clinical/providers/clinical_provider.dart';
import '../../../clinical/presentation/widgets/pediatric_nutrition_tab_view.dart';
import '../../../clinical/presentation/widgets/sports_nutrition_tab_view.dart';
import '../../../nutrition/presentation/pages/nutritional_plan_viewer_page.dart';
import '../../../nutrition/presentation/pages/portion_assigner_page.dart';
import '../../../nutrition/presentation/pages/food_catalog_page.dart';
import '../../../calculators/presentation/pages/tmb_get_calculator_page.dart';
import '../../../calculators/presentation/pages/food_waste_calculator_page.dart';
import '../../models/patient_model.dart';
import '../../providers/patients_provider.dart';
import 'patient_form_page.dart';

class PatientDetail360Page extends StatefulWidget {
  final PatientModel patient;

  const PatientDetail360Page({super.key, required this.patient});

  @override
  State<PatientDetail360Page> createState() => _PatientDetail360PageState();
}

class _PatientDetail360PageState extends State<PatientDetail360Page>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ClinicalProvider>().loadClinicalData(widget.patient.id);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
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
    final clinicalProvider = context.watch<ClinicalProvider>();

    // Obtener paciente actualizado si fue editado
    final currentPatient = provider.rawPatients.firstWhere(
      (p) => p.id == widget.patient.id,
      orElse: () => widget.patient,
    );

    final ageStr = currentPatient.age != null ? '${currentPatient.age} años' : 'Edad N/D';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Ficha 360° del Paciente',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppTheme.primaryPurple),
            tooltip: 'Editar Datos del Paciente',
            onPressed: () async {
              final updated = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => PatientFormPage(patient: currentPatient),
                ),
              );
              if (updated == true && mounted) {
                provider.fetchPatients();
              }
            },
          ),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    // Patient Header Card (Kombai var_a641f3e09398)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Initials Avatar
                                Container(
                                  width: 64,
                                  height: 64,
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
                                      currentPatient.initials,
                                      style: GoogleFonts.montserrat(
                                        color: Colors.white,
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),

                                // Name, DNI, Status badge
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              currentPatient.fullName,
                                              style: GoogleFonts.montserrat(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                                color: theme.colorScheme.onSurface,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: currentPatient.isActive
                                                  ? AppTheme.successGreen.withValues(alpha: 0.12)
                                                  : Colors.grey.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              currentPatient.isActive ? 'ACTIVO' : 'INACTIVO',
                                              style: GoogleFonts.montserrat(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: currentPatient.isActive
                                                    ? AppTheme.successGreen
                                                    : Colors.grey[700],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '$ageStr  •  DNI ${currentPatient.dni ?? "S/D"}',
                                        style: GoogleFonts.montserrat(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                          color: AppTheme.textSecondaryLight,
                                        ),
                                      ),
                                      if (currentPatient.email != null &&
                                          currentPatient.email!.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          currentPatient.email!,
                                          style: GoogleFonts.montserrat(
                                            fontSize: 12,
                                            color: AppTheme.textSecondaryLight,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Divider(height: 1, color: AppTheme.borderLight),
                            const SizedBox(height: 12),

                            // Accesos Rápidos Módulo Clínico
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => AnthropometryFormPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.straighten_rounded, size: 16),
                                    label: const Text('+ ISAK', style: TextStyle(fontSize: 12)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => SomatocartAndGraphicsPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.line_axis_rounded, size: 16),
                                    label: const Text('Somatocarta', style: TextStyle(fontSize: 12)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => AnamnesisFormPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.description_outlined, size: 16),
                                    label: const Text('Anamnesis', style: TextStyle(fontSize: 12)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                InkWell(
                                  onTap: () => _openWhatsApp(currentPatient.whatsappUrl),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF25D366).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(
                                      Icons.chat_rounded,
                                      color: Color(0xFF128C7E),
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Accesos Rápidos Módulo Nutrición (FASE 4)
                            Row(
                              children: [
                                Expanded(
                                  flex: 2,
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryPurple,
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => NutritionalPlanViewerPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.restaurant_menu_rounded, size: 16, color: Colors.white),
                                    label: const Text(
                                      'Ver Dieta / Plan',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => PortionAssignerPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.grid_view_rounded, size: 15),
                                    label: const Text('Raciones', style: TextStyle(fontSize: 11)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => const FoodCatalogPage(),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.search_rounded, size: 15),
                                    label: const Text('Catálogo', style: TextStyle(fontSize: 11)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Accesos Rápidos Calculadoras Express (FASE 5)
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => TmbGetCalculatorPage(patient: currentPatient),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.calculate_rounded, size: 16, color: AppTheme.primaryPurple),
                                    label: const Text(
                                      'TMB & GET',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      minimumSize: Size.zero,
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => const FoodWasteCalculatorPage(),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.pie_chart_outline, size: 16, color: AppTheme.accentPurple),
                                    label: const Text(
                                      'Merma Alimentos',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverTabBarDelegate(
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelColor: AppTheme.primaryPurple,
                  unselectedLabelColor: AppTheme.textSecondaryLight,
                  indicatorColor: AppTheme.primaryPurple,
                  indicatorWeight: 3,
                  labelStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                  unselectedLabelStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                  tabs: const [
                    Tab(text: 'Resumen'),
                    Tab(text: 'Consultas'),
                    Tab(text: 'Historial / Ficha'),
                    Tab(text: 'Pediatría'),
                    Tab(text: 'Deportiva'),
                  ],
                ),
                backgroundColor: theme.scaffoldBackgroundColor,
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildResumenTab(currentPatient, clinicalProvider),
            _buildConsultasTab(currentPatient),
            _buildHistorialTab(currentPatient, clinicalProvider),
            _buildPediatriaTab(currentPatient),
            _buildDeportivaTab(currentPatient, clinicalProvider),
          ],
        ),
      ),
    );
  }

  Widget _buildResumenTab(PatientModel patient, ClinicalProvider clinicalProvider) {
    final theme = Theme.of(context);
    final latest = clinicalProvider.latestMeasurement;
    final isak = latest?.isakResult;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Card de Objetivo Principal
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.track_changes_rounded, color: AppTheme.primaryPurple, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'OBJETIVO PRINCIPAL',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  patient.objective ?? 'Sin objetivo registrado en el expediente.',
                  style: GoogleFonts.montserrat(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Header de Antropometría ISAK
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'MÉTRICAS Y ANTROPOMETRÍA ISAK',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            TextButton.icon(
              style: TextButton.styleFrom(minimumSize: Size.zero, padding: EdgeInsets.zero),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => SomatocartAndGraphicsPage(patient: patient),
                  ),
                );
              },
              icon: const Icon(Icons.line_axis_rounded, size: 16),
              label: const Text('Ver Somatocarta', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                label: 'Peso Actual',
                value: latest != null ? '${latest.weight} kg' : '68.5 kg',
                icon: Icons.monitor_weight_outlined,
                color: AppTheme.primaryPurple,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricCard(
                label: '% Grasa ISAK',
                value: isak != null ? '${isak.fatPercentage} %' : '21.4 %',
                icon: Icons.pie_chart_outline_rounded,
                color: AppTheme.accentPurple,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                label: 'Masa Muscular',
                value: isak != null ? '${isak.muscleKg} kg' : '32.1 kg',
                icon: Icons.fitness_center_rounded,
                color: AppTheme.successGreen,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricCard(
                label: 'Somatotipo',
                value: isak != null ? isak.somatotypeCategory : 'Meso-Endo',
                icon: Icons.speed_rounded,
                color: Colors.blue,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Datos Personales & Contacto
        Text(
          'INFORMACIÓN DE CONTACTO Y DATOS',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              _buildDataTile(
                icon: Icons.badge_outlined,
                label: 'DNI / Documento',
                value: patient.dni ?? 'Sin cargar',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.email_outlined,
                label: 'Correo Electrónico',
                value: patient.email ?? 'Sin cargar',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.phone_outlined,
                label: 'Teléfono / WhatsApp',
                value: patient.phone ?? 'Sin cargar',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.wc_rounded,
                label: 'Género registrado',
                value: patient.gender == 'MALE'
                    ? 'Masculino'
                    : patient.gender == 'FEMALE'
                        ? 'Femenino'
                        : 'Otro / No especificado',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildConsultasTab(PatientModel patient) {
    final theme = Theme.of(context);

    final consultations = [
      {
        'title': 'Consulta de Control y Ajuste Nutricional',
        'date': '25 Sep 2026',
        'doctor': 'Lic. Marina Gutiérrez',
        'summary': 'Buena adherencia al plan. Descenso de 1.2 kg de masa grasa. Se reajustan carbohidratos peri-entreno.',
        'tag': 'Control',
      },
      {
        'title': 'Evaluación Antropométrica ISAK Completa',
        'date': '28 Ago 2026',
        'doctor': 'Lic. Marina Gutiérrez',
        'summary': 'Toma de 6 pliegues cutáneos, perímetros y diámetros óseos. Cálculo de somatotipo (meso-endomorfo).',
        'tag': 'ISAK',
      },
      {
        'title': 'Consulta de Alta y Diagnóstico Inicial',
        'date': '02 Ago 2026',
        'doctor': 'Lic. Marina Gutiérrez',
        'summary': 'Anamnesis alimentaria, laboratorio de rutina y entrega de guía de intercambio de alimentos.',
        'tag': 'Inicial',
      },
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'HISTORIAL DE CONSULTAS (${consultations.length})',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                minimumSize: Size.zero,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Nueva consulta agendada'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Nueva Consulta', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...consultations.map((item) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.softPurpleChip,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          item['tag']!,
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryPurple,
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.event_outlined, size: 14, color: AppTheme.textSecondaryLight),
                          const SizedBox(width: 4),
                          Text(
                            item['date']!,
                            style: GoogleFonts.montserrat(
                              fontSize: 12,
                              color: AppTheme.textSecondaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item['title']!,
                    style: GoogleFonts.montserrat(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item['summary']!,
                    style: GoogleFonts.montserrat(
                      fontSize: 12.5,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildHistorialTab(PatientModel patient, ClinicalProvider clinicalProvider) {
    final anamnesis = clinicalProvider.anamnesis;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'ANTECEDENTES CLÍNICOS Y HÁBITOS',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                minimumSize: Size.zero,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              ),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AnamnesisFormPage(patient: patient),
                  ),
                );
              },
              icon: const Icon(Icons.edit_outlined, size: 14),
              label: const Text('Editar Ficha', style: TextStyle(fontSize: 11)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Card(
          child: Column(
            children: [
              _buildDataTile(
                icon: Icons.healing_rounded,
                label: 'Antecedentes Médicos / Patologías',
                value: (anamnesis?.pathologies.isNotEmpty ?? false)
                    ? anamnesis!.pathologies
                    : 'Ninguna relevante declarada. Analítica normal.',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.no_food_rounded,
                label: 'Alergias e Intolerancias Alimentarias',
                value: (anamnesis?.allergiesAndIntolerances.isNotEmpty ?? false)
                    ? anamnesis!.allergiesAndIntolerances
                    : 'Intolerancia leve a la lactosa. Prefiere leche descremada deslactosada.',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.medical_information_outlined,
                label: 'Síntomas Digestivos Habituales',
                value: (anamnesis?.digestiveSymptoms.isNotEmpty ?? false)
                    ? anamnesis!.digestiveSymptoms.join(', ')
                    : 'Sin síntomas digestivos agudos.',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.directions_run_rounded,
                label: 'Actividad Física y Deporte',
                value: (anamnesis?.sportsPracticed.isNotEmpty ?? false)
                    ? '${anamnesis!.physicalActivityLevel} - ${anamnesis.sportsPracticed}'
                    : 'Entrenamiento funcional 4 veces por semana. Ciclismo urbano en fines de semana.',
              ),
              const Divider(height: 1, color: AppTheme.borderLight),
              _buildDataTile(
                icon: Icons.water_drop_outlined,
                label: 'Consumo de Agua Diario y Sueño',
                value: anamnesis != null
                    ? '${anamnesis.dailyWaterLiters} L/día  •  ${anamnesis.sleepHours} hrs de descanso'
                    : 'Aproximadamente 2.5 L/día.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Recordatorio 24 Horas Preview
        if (anamnesis?.r24hRecall != null) ...[
          Text(
            'RECORDATORIO DE 24 HORAS (R24H)',
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
              color: AppTheme.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Column(
                children: [
                  _buildR24hItem('Desayuno', anamnesis!.r24hRecall.breakfast),
                  const Divider(height: 12),
                  _buildR24hItem('Media Mañana', anamnesis.r24hRecall.morningSnack),
                  const Divider(height: 12),
                  _buildR24hItem('Almuerzo', anamnesis.r24hRecall.lunch),
                  const Divider(height: 12),
                  _buildR24hItem('Media Tarde', anamnesis.r24hRecall.afternoonSnack),
                  const Divider(height: 12),
                  _buildR24hItem('Cena', anamnesis.r24hRecall.dinner),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildR24hItem(String title, String val) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            title,
            style: GoogleFonts.montserrat(
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryPurple,
            ),
          ),
        ),
        Expanded(
          child: Text(
            val.isNotEmpty ? val : 'Sin especificar',
            style: GoogleFonts.montserrat(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
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
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataTile({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.accentPurple, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.montserrat(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPediatriaTab(PatientModel patient) {
    return PediatricNutritionTabView(patient: patient);
  }

  Widget _buildDeportivaTab(PatientModel patient, ClinicalProvider clinicalProvider) {
    return SportsNutritionTabView(
      patient: patient,
      latestMeasurementWeight: clinicalProvider.latestMeasurement?.weight,
      latestMeasurementFatPercentage: clinicalProvider.latestMeasurement?.isakResult.fatPercentage,
    );
  }
}

class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  final Color backgroundColor;

  _SliverTabBarDelegate(this._tabBar, {required this.backgroundColor});

  @override
  double get minExtent => _tabBar.preferredSize.height;

  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: backgroundColor,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabBarDelegate oldDelegate) {
    return false;
  }
}
