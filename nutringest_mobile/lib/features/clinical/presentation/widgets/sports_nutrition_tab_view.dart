import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/sports_history_model.dart';
import '../../services/clinical_service.dart';

class SportsNutritionTabView extends StatefulWidget {
  final PatientModel patient;
  final double? latestMeasurementWeight;
  final double? latestMeasurementFatPercentage;

  const SportsNutritionTabView({
    super.key,
    required this.patient,
    this.latestMeasurementWeight,
    this.latestMeasurementFatPercentage,
  });

  @override
  State<SportsNutritionTabView> createState() => _SportsNutritionTabViewState();
}

class _SportsNutritionTabViewState extends State<SportsNutritionTabView> {
  final ClinicalService _clinicalService = ClinicalService();
  late Future<SportsHistoryModel?> _sportsFuture;

  // Hydration questionnaire state
  double _dailyFluidLiters = 2.5;
  bool _usesDiuretics = false;
  bool _hasDehydrationHistory = false;
  bool _hasCrampsHistory = false;

  // Training load state for periodized macros
  String _selectedLoadLevel = 'MODERATE';

  // Selected supplement state
  String _selectedSupplementId = 'creatine';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _sportsFuture = _clinicalService.getSportsHistory(widget.patient.id);
  }

  Future<void> _refresh() async {
    setState(() {
      _loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return FutureBuilder<SportsHistoryModel?>(
      future: _sportsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: CircularProgressIndicator(),
            ),
          );
        }

        final sportsHistory = snapshot.data;
        final bool isEmpty = sportsHistory == null || sportsHistory.practices.isEmpty;

        if (isEmpty) {
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeaderBanner(theme, isDark, sportsHistory),
                const SizedBox(height: 16),
                _buildEmptyStateCard(context, isDark),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: _buildPopulatedView(context, theme, isDark, sportsHistory),
        );
      },
    );
  }

  Widget _buildEmptyStateCard(BuildContext context, bool isDark) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 36.0, horizontal: 24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.deepOrange.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.fitness_center_rounded,
                size: 44,
                color: Colors.deepOrange,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin evaluación deportiva registrada para este paciente',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Registrá la evaluación deportiva en la plataforma para habilitar cálculos metabólicos y ergogénicos.',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 12.5,
                color: AppTheme.textSecondaryLight,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.deepOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Completá el registro de historia deportiva desde la plataforma web.',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(
                '+ Registrar Evaluación Deportiva',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderBanner(
    ThemeData theme,
    bool isDark,
    SportsHistoryModel? history,
  ) {
    return Card(
      elevation: 0,
      color: isDark ? AppTheme.cardDark : Colors.deepOrange.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark
              ? Colors.deepOrange.withValues(alpha: 0.3)
              : Colors.deepOrange.shade200,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.deepOrange.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text('🏋️‍♂️', style: TextStyle(fontSize: 28)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'NUTRICIÓN DEPORTIVA Y RENDIMIENTO',
                    style: GoogleFonts.montserrat(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: Colors.deepOrange.shade800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'METs, Perientreno, Hidratación & Suplementación',
                    style: GoogleFonts.montserrat(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    history != null
                        ? 'Nivel Competitivo: ${history.competitionLevel ?? "Recreativo"} • ${history.practices.length} disciplina(s)'
                        : 'Optimización metabólica para atletas y deportistas',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPopulatedView(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    SportsHistoryModel sportsHistory,
  ) {
    // Determine effective body weight
    final double weight = widget.patient.weight ??
        sportsHistory.weightKg ??
        widget.latestMeasurementWeight ??
        70.0;

    // Determine FFM (Fat Free Mass)
    final double? fatPct = sportsHistory.fatPercentage ??
        widget.latestMeasurementFatPercentage;
    final double ffm = sportsHistory.ffmKg ??
        (fatPct != null && fatPct > 0
            ? weight * (1.0 - (fatPct / 100.0))
            : weight * 0.8);

    // Calculate METs per practice
    final practices = sportsHistory.practices;
    double calculatedTotalMetsKcal = 0.0;
    final List<Map<String, dynamic>> practiceKcalList = [];

    for (final p in practices) {
      final dailyKcal = p.calculateDailyMetsKcal(weight);
      calculatedTotalMetsKcal += dailyKcal;
      practiceKcalList.add({
        'practice': p,
        'dailyKcal': dailyKcal,
      });
    }

    final double metsExpenditure = sportsHistory.metsExpenditure ?? calculatedTotalMetsKcal;
    final double cunninghamRmr = sportsHistory.cunninghamRmr ?? (500.0 + (22.0 * ffm));
    final double teeTotal = cunninghamRmr + metsExpenditure;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header Banner
        _buildHeaderBanner(theme, isDark, sportsHistory),
        const SizedBox(height: 16),

        // Section 1: Disciplines & METs Expenditure
        _buildSectionTitle('GASTO ENERGÉTICO Y METS POR DISCIPLINA', Icons.bolt_rounded, Colors.deepOrange),
        const SizedBox(height: 8),
        _buildDisciplinesCard(context, isDark, practiceKcalList, metsExpenditure),
        const SizedBox(height: 16),

        // Section 2: Energy Requirements (Cunningham RMR + METs)
        _buildSectionTitle('REQUERIMIENTOS ENERGÉTICOS TOTALES (CUNNINGHAM RMR + METS)', Icons.local_fire_department_rounded, Colors.deepOrange),
        const SizedBox(height: 8),
        _buildEnergyRequirementsCard(cunninghamRmr, ffm, metsExpenditure, teeTotal),
        const SizedBox(height: 16),

        // Section 3: Periodized Macros
        _buildSectionTitle('PRESCRIPCIÓN PERIODIZADA DE MACRONUTRIENTES', Icons.track_changes_rounded, AppTheme.primaryPurple),
        const SizedBox(height: 8),
        _buildPeriodizedMacrosCard(context, isDark, weight),
        const SizedBox(height: 16),

        // Section 4: Dynamic Hydration Protocol
        _buildSectionTitle('PROTOCOLO & EVALUACIÓN DE HIDRATACIÓN (WINDER)', Icons.water_drop_rounded, Colors.cyan),
        const SizedBox(height: 8),
        _buildHydrationCard(context, isDark, weight),
        const SizedBox(height: 16),

        // Section 5: Dynamic AIS Supplements
        _buildSectionTitle('PROTOCOLOS DE SUPLEMENTACIÓN ERGOGÉNICA (AIS CATEGORÍA A)', Icons.medication_rounded, Colors.indigo),
        const SizedBox(height: 8),
        _buildErgogenicSupplementsCard(context, isDark, weight),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSectionTitle(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.7,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDisciplinesCard(
    BuildContext context,
    bool isDark,
    List<Map<String, dynamic>> practiceKcalList,
    double totalMetsExpenditure,
  ) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.fitness_center_rounded, color: Colors.deepOrange, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Disciplinas Activas (${practiceKcalList.length})',
                  style: GoogleFonts.montserrat(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.deepOrange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${totalMetsExpenditure.toStringAsFixed(0)} kcal/día METs',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.deepOrange,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (int i = 0; i < practiceKcalList.length; i++) ...[
              if (i > 0) const Divider(height: 16, color: AppTheme.borderLight),
              _buildPracticeItem(
                practiceKcalList[i]['practice'] as SportPracticeModel,
                practiceKcalList[i]['dailyKcal'] as double,
                isDark,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPracticeItem(SportPracticeModel practice, double dailyKcal, bool isDark) {
    final metVal = practice.getEffectiveMet();
    final mins = practice.getEffectiveMinutes();
    final days = practice.getEffectiveDays();
    final sess = practice.getEffectiveSessions();
    final level = practice.getEffectiveLevel();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.deepOrange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.directions_run_rounded, color: Colors.deepOrange, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      practice.name,
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'MET: ${metVal.toStringAsFixed(1)}',
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.amber.shade900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                'Nivel: $level • ${mins.toStringAsFixed(0)} min/sesión • ${days.toStringAsFixed(0)} días/sem ($sess ses/día)',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  color: AppTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Gasto estimado: ${dailyKcal.toStringAsFixed(0)} kcal/día',
                style: GoogleFonts.montserrat(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: Colors.deepOrange,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEnergyRequirementsCard(
    double cunninghamRmr,
    double ffm,
    double metsExpenditure,
    double teeTotal,
  ) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: _buildEnergyMetricTile(
                    title: 'TMB Cunningham',
                    value: '${cunninghamRmr.toStringAsFixed(0)} kcal',
                    subtitle: '500 + 22 × ${ffm.toStringAsFixed(1)}kg FFM',
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildEnergyMetricTile(
                    title: 'Gasto METs',
                    value: '${metsExpenditure.toStringAsFixed(0)} kcal',
                    subtitle: 'Actividad Deportiva',
                    color: Colors.amber.shade800,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildEnergyMetricTile(
                    title: 'Gasto Total (TEE)',
                    value: '${teeTotal.toStringAsFixed(0)} kcal',
                    subtitle: 'RMR + METs / día',
                    color: AppTheme.successGreen,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnergyMetricTile({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 14.5,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 9.5,
              color: AppTheme.textSecondaryLight,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodizedMacrosCard(BuildContext context, bool isDark, double weight) {
    // Macro multipliers according to load level
    double choMin = 5.0;
    double choMax = 7.0;
    double proMin = 1.6;
    double proMax = 2.2;
    double fatMin = 1.0;
    double fatMax = 1.2;

    switch (_selectedLoadLevel) {
      case 'LOW':
        choMin = 3.0;
        choMax = 5.0;
        proMin = 1.6;
        proMax = 2.0;
        fatMin = 1.0;
        fatMax = 1.2;
        break;
      case 'HIGH':
        choMin = 6.0;
        choMax = 10.0;
        proMin = 1.6;
        proMax = 2.2;
        fatMin = 1.0;
        fatMax = 1.2;
        break;
      case 'EXTREME':
        choMin = 8.0;
        choMax = 12.0;
        proMin = 1.6;
        proMax = 2.2;
        fatMin = 1.0;
        fatMax = 1.2;
        break;
      case 'CUT':
        choMin = 3.5;
        choMax = 5.0;
        proMin = 2.2;
        proMax = 2.8;
        fatMin = 0.6;
        fatMax = 0.8;
        break;
      case 'MODERATE':
      default:
        choMin = 5.0;
        choMax = 7.0;
        proMin = 1.6;
        proMax = 2.2;
        fatMin = 1.0;
        fatMax = 1.2;
        break;
    }

    final choGramsMin = (weight * choMin).round();
    final choGramsMax = (weight * choMax).round();
    final proGramsMin = (weight * proMin).round();
    final proGramsMax = (weight * proMax).round();
    final fatGramsMin = (weight * fatMin).round();
    final fatGramsMax = (weight * fatMax).round();

    final leucineMin = (weight * 0.3).toStringAsFixed(1);
    final leucineMax = (weight * 0.4).toStringAsFixed(1);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Fase de Carga Deportiva Actual',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildLoadChip('LOW', 'Baja / Lesión (<1h)'),
                  const SizedBox(width: 6),
                  _buildLoadChip('MODERATE', 'Moderada (1-2h)'),
                  const SizedBox(width: 6),
                  _buildLoadChip('HIGH', 'Alta (2-3h)'),
                  const SizedBox(width: 6),
                  _buildLoadChip('EXTREME', 'Extrema (>4h)'),
                  const SizedBox(width: 6),
                  _buildLoadChip('CUT', 'Déficit / Cut'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Macro cards row
            Row(
              children: [
                Expanded(
                  child: _buildMacroItem(
                    label: 'Carbohidratos',
                    code: 'CHO',
                    gramsRange: '$choGramsMin - $choGramsMax g',
                    ratio: '$choMin - $choMax g/kg',
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMacroItem(
                    label: 'Proteínas',
                    code: 'PRO',
                    gramsRange: '$proGramsMin - $proGramsMax g',
                    ratio: '$proMin - $proMax g/kg',
                    color: AppTheme.successGreen,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMacroItem(
                    label: 'Grasas',
                    code: 'FAT',
                    gramsRange: '$fatGramsMin - $fatGramsMax g',
                    ratio: '$fatMin - $fatMax g/kg',
                    color: Colors.amber.shade800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Leucine threshold note
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryPurple.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryPurple, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Sinergia Peri-prandial & Umbral de Leucina:',
                          style: GoogleFonts.montserrat(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryPurple,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Distribuir la proteína en 3 a 5 tomas diarias de $leucineMin – $leucineMax g de leucina por comida para maximizar la síntesis proteica muscular (MPS) vía mTORC1.',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadChip(String id, String label) {
    final isSelected = _selectedLoadLevel == id;
    return ChoiceChip(
      selected: isSelected,
      label: Text(label),
      labelStyle: GoogleFonts.montserrat(
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : AppTheme.textSecondaryLight,
      ),
      selectedColor: AppTheme.primaryPurple,
      backgroundColor: Colors.transparent,
      side: BorderSide(
        color: isSelected ? AppTheme.primaryPurple : AppTheme.borderLight,
      ),
      onSelected: (val) {
        if (val) {
          setState(() {
            _selectedLoadLevel = id;
          });
        }
      },
    );
  }

  Widget _buildMacroItem({
    required String label,
    required String code,
    required String gramsRange,
    required String ratio,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                code,
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            gramsRange,
            style: GoogleFonts.montserrat(
              fontSize: 12.5,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            ratio,
            style: GoogleFonts.montserrat(
              fontSize: 9.5,
              color: AppTheme.textSecondaryLight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHydrationCard(BuildContext context, bool isDark, double weight) {
    final preMl = (weight * 6).round();
    final intraMl = (weight * 8).round();
    final bool hasRisk = _hasDehydrationHistory || _hasCrampsHistory || _usesDiuretics;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Daily fluid row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Consumo Diario Habitual',
                        style: GoogleFonts.montserrat(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Agua, infusiones y bebidas',
                        style: GoogleFonts.montserrat(
                          fontSize: 10.5,
                          color: AppTheme.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.cyan.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${_dailyFluidLiters.toStringAsFixed(1)} L/día',
                    style: GoogleFonts.montserrat(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.cyan.shade900,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline_rounded, size: 20),
                  onPressed: () {
                    if (_dailyFluidLiters > 1.0) {
                      setState(() => _dailyFluidLiters -= 0.5);
                    }
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 20),
                  onPressed: () {
                    if (_dailyFluidLiters < 8.0) {
                      setState(() => _dailyFluidLiters += 0.5);
                    }
                  },
                ),
              ],
            ),
            const Divider(height: 20, color: AppTheme.borderLight),

            // Risk questions
            Text(
              'Cuestionario de Riesgo Hídrico:',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 6),
            _buildHydrationToggleRow(
              'Medicamentos / Diuréticos:',
              _usesDiuretics,
              (v) => setState(() => _usesDiuretics = v),
            ),
            _buildHydrationToggleRow(
              'Historial de Deshidratación:',
              _hasDehydrationHistory,
              (v) => setState(() => _hasDehydrationHistory = v),
            ),
            _buildHydrationToggleRow(
              'Calambres por Calor / Fatiga:',
              _hasCrampsHistory,
              (v) => setState(() => _hasCrampsHistory = v),
            ),

            if (hasRisk) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.amber.shade900, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Factores de Riesgo Hídrico Detectados:',
                            style: GoogleFonts.montserrat(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.amber.shade900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Se sugiere realizar prueba de tasa de sudoración en campo (pesaje pre/post entrenamiento) y añadir electrólitos (300-600 mg de Sodio/litro de agua).',
                            style: GoogleFonts.montserrat(
                              fontSize: 10.5,
                              color: Colors.amber.shade900,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 14),
            Text(
              'Protocolo Personalizado (Peso: ${weight.toStringAsFixed(1)} kg):',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.cyan.shade900,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildHydrationMetricTile(
                    title: 'Pre-Entreno',
                    value: '$preMl ml',
                    desc: '5–7 ml/kg (4h previas)',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildHydrationMetricTile(
                    title: 'Intra-Entreno',
                    value: '$intraMl ml/h',
                    desc: 'Sorbos c/15-20 min',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildHydrationMetricTile(
                    title: 'Post-Entreno',
                    value: '150%',
                    desc: '1.5 L/kg peso perdido',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHydrationToggleRow(String label, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.montserrat(fontSize: 11.5),
            ),
          ),
          Switch.adaptive(
            value: value,
            activeTrackColor: Colors.cyan,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildHydrationMetricTile({
    required String title,
    required String value,
    required String desc,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.cyan.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.cyan.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Colors.cyan.shade900,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: Colors.cyan.shade900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            desc,
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 9,
              color: AppTheme.textSecondaryLight,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildErgogenicSupplementsCard(BuildContext context, bool isDark, double weight) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildSupplementChip('creatine', 'Creatina'),
                  const SizedBox(width: 6),
                  _buildSupplementChip('caffeine', 'Cafeína'),
                  const SizedBox(width: 6),
                  _buildSupplementChip('beta_alanine', 'Beta-Alanina'),
                  const SizedBox(width: 6),
                  _buildSupplementChip('nitrates', 'Nitratos'),
                  const SizedBox(width: 6),
                  _buildSupplementChip('bicarbonate', 'Bicarbonato'),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _buildSelectedSupplementDetail(weight),
          ],
        ),
      ),
    );
  }

  Widget _buildSupplementChip(String id, String label) {
    final isSelected = _selectedSupplementId == id;
    return ChoiceChip(
      selected: isSelected,
      label: Text(label),
      labelStyle: GoogleFonts.montserrat(
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : AppTheme.textSecondaryLight,
      ),
      selectedColor: Colors.indigo,
      backgroundColor: Colors.transparent,
      side: BorderSide(
        color: isSelected ? Colors.indigo : AppTheme.borderLight,
      ),
      onSelected: (val) {
        if (val) {
          setState(() {
            _selectedSupplementId = id;
          });
        }
      },
    );
  }

  Widget _buildSelectedSupplementDetail(double weight) {
    String name = 'Creatina Monohidratada';
    String category = 'Fuerza / Potencia / Resíntesis ATP';
    String dose = 'Carga: ${(weight * 0.3).toStringAsFixed(1)} g/día (5-7 días) | Mantención: ${(weight * 0.06).toStringAsFixed(1)} g/día';
    String timing = 'Post-entrenamiento con 30-50g de carbohidratos para acelerar transporte vía insulina.';
    String mechanism = 'Aumento de fosfocreatina intramuscular (+10-20%), resíntesis rápida de ATP en esfuerzos explosivos.';

    switch (_selectedSupplementId) {
      case 'caffeine':
        name = 'Cafeína Anhidra';
        category = 'Rendimiento SNC / Resistencia';
        dose = '${(weight * 3).toStringAsFixed(0)} mg – ${(weight * 6).toStringAsFixed(0)} mg total';
        timing = '45 – 60 minutos previos al entrenamiento o competencia.';
        mechanism = 'Antagonista de receptores de adenosina, reducción del RPE (esfuerzo percibido) y mayor reclutamiento de unidades motoras.';
        break;
      case 'beta_alanine':
        name = 'Beta-Alanina';
        category = 'Tampón Intracelular / Resistencia Láctica';
        dose = '${(weight * 0.065).toStringAsFixed(1)} g/día (~3.2g – 6.4g repartidos en 4 tomas)';
        timing = 'Dividir en 4 tomas de 0.8-1.6g/día por 4 a 8 semanas.';
        mechanism = 'Aumento del 60-80% en carnosina muscular. Amortiguador de H+ en esfuerzos de alta intensidad (1-10 min).';
        break;
      case 'nitrates':
        name = 'Nitrato Dietético / Jugo de Remolacha';
        category = 'Vasodilatación / Eficiencia O2';
        dose = '${(weight * 6.4).toStringAsFixed(1)} mg – ${(weight * 12.8).toStringAsFixed(1)} mg NO3⁻ (~350–800 mg de Nitrato)';
        timing = 'Consumir 2.5 a 3 horas antes de la prueba deportiva.';
        mechanism = 'Vasodilatación mediada por óxido nítrico (vía NO3-NO2-NO), reducción del costo de O2 a intensidad submáxima.';
        break;
      case 'bicarbonate':
        name = 'Bicarbonato de Sodio';
        category = 'Amortiguador Extracelular / Esfuerzo Láctico';
        dose = '${(weight * 0.2).toStringAsFixed(1)} g – ${(weight * 0.3).toStringAsFixed(1)} g de NaHCO3';
        timing = 'Consumir 60 – 150 min antes con 1L de agua y pequeñas dosis de CHO.';
        mechanism = 'Amortiguador extracelular de H+, potencia el eflujo de lactato fuera del miocito en ejercicios lácticos intensos.';
        break;
      case 'creatine':
      default:
        break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.indigo.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.indigo.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: GoogleFonts.montserrat(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: Colors.indigo.shade900,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.indigo.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'AIS Categoría A',
                  style: GoogleFonts.montserrat(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: Colors.indigo.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            category,
            style: GoogleFonts.montserrat(
              fontSize: 10.5,
              color: AppTheme.textSecondaryLight,
            ),
          ),
          const Divider(height: 16, color: AppTheme.borderLight),
          _buildSuppDetailRow('Dosis personalizada:', dose, Icons.straighten_rounded),
          const SizedBox(height: 6),
          _buildSuppDetailRow('Timing recomendado:', timing, Icons.access_time_rounded),
          const SizedBox(height: 6),
          _buildSuppDetailRow('Mecanismo fisiológico:', mechanism, Icons.biotech_rounded),
        ],
      ),
    );
  }

  Widget _buildSuppDetailRow(String label, String value, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: Colors.indigo),
        const SizedBox(width: 6),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: GoogleFonts.montserrat(
                fontSize: 11,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              children: [
                TextSpan(
                  text: '$label ',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                TextSpan(text: value),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
