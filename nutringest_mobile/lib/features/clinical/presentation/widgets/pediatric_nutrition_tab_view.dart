import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/pediatric_history_model.dart';
import '../../services/clinical_service.dart';

class PediatricNutritionTabView extends StatefulWidget {
  final PatientModel patient;

  const PediatricNutritionTabView({
    super.key,
    required this.patient,
  });

  @override
  State<PediatricNutritionTabView> createState() => _PediatricNutritionTabViewState();
}

class _PediatricNutritionTabViewState extends State<PediatricNutritionTabView> {
  final ClinicalService _clinicalService = ClinicalService();
  late Future<PediatricHistoryModel?> _pediatricFuture;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _pediatricFuture = _clinicalService.getPediatricHistory(widget.patient.id);
  }

  Future<void> _refresh() async {
    setState(() {
      _loadData();
    });
  }

  Future<void> _openWhatsApp(String url) async {
    if (url.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('El representante no tiene un número de teléfono válido.')),
        );
      }
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

  Future<void> _makePhoneCall(String phone) async {
    final cleanDigits = phone.replaceAll(RegExp(r'[^\d+]'), '');
    if (cleanDigits.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Número de teléfono inválido.')),
        );
      }
      return;
    }
    final uri = Uri.parse('tel:$cleanDigits');
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir la aplicación de llamadas.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al intentar realizar la llamada.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return FutureBuilder<PediatricHistoryModel?>(
      future: _pediatricFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: CircularProgressIndicator(color: AppTheme.primaryPurple),
            ),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'Error al cargar historia pediátrica',
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    snapshot.error.toString(),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryPurple,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _refresh,
                    icon: const Icon(Icons.refresh_rounded, size: 16),
                    label: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }

        final history = snapshot.data;
        if (history == null) {
          return RefreshIndicator(
            color: AppTheme.primaryPurple,
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeaderBanner(theme, isDark, null),
                const SizedBox(height: 16),
                _buildEmptyStateCard(context, isDark),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppTheme.primaryPurple,
          onRefresh: _refresh,
          child: _buildPopulatedView(context, theme, isDark, history),
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
                color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.child_care_rounded,
                size: 44,
                color: AppTheme.primaryPurple,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin historia clínica pediátrica registrada para este paciente',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Registra la evaluación pediátrica completa para habilitar cálculos de maduración biológica Mirwald, fórmulas lácteas EVANUTDEP y curvas INN-SISVAN.',
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
                backgroundColor: AppTheme.primaryPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => _showRegisterPediatricModal(context, null),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(
                '+ Registrar Historia Pediátrica',
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

  Widget _buildPopulatedView(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
  ) {
    // 0. Edad y Sexo Biológico (Cálculo dinámico sin valores estáticos ficticios)
    final double ageYears;
    final int ageMonths;
    if (widget.patient.birthDate != null) {
      final now = DateTime.now();
      final b = widget.patient.birthDate!;
      int m = (now.year - b.year) * 12 + now.month - b.month;
      if (now.day < b.day) m = math.max(0, m - 1);
      ageMonths = m;
      ageYears = double.parse((m / 12.0).toStringAsFixed(2));
    } else if (widget.patient.age != null) {
      ageYears = widget.patient.age!.toDouble();
      ageMonths = (ageYears * 12).round();
    } else {
      ageYears = 0.0;
      ageMonths = 0;
    }

    final isFemale = (widget.patient.gender ?? '').toUpperCase() == 'FEMALE' ||
        (widget.patient.gender ?? '').toUpperCase() == 'FEMENINO';

    // Mediciones antropométricas (Prioridad: historial pediátrico -> perfil general, nunca datos falsos)
    final weight = history.weightKg ?? widget.patient.weight;
    final height = history.heightCm ?? widget.patient.height;
    final sittingHeight = history.sittingHeightCm ??
        (height != null ? double.parse((height * 0.55).toStringAsFixed(1)) : null);

    // 1. Maduración Mirwald PHV
    final bool canCalculateMirwald = (history.mirwaldPhv != null) ||
        (weight != null && height != null && sittingHeight != null && ageYears > 0);
    final double? mirwaldOffset;
    final bool isMirwaldValid;
    final String phvLabel;

    if (canCalculateMirwald) {
      final double mirwaldVal;
      if (history.mirwaldPhv != null) {
        mirwaldVal = history.mirwaldPhv!;
      } else {
        final lei = height! - sittingHeight!;
        if (isFemale) {
          mirwaldVal = -9.376 +
              0.0001882 * lei * sittingHeight +
              0.0022 * ageYears * lei +
              0.005841 * ageYears * sittingHeight -
              0.002658 * ageYears * weight! +
              0.07693 * weight * (100 / height);
        } else {
          mirwaldVal = -9.236 +
              0.0002708 * lei * sittingHeight -
              0.001663 * ageYears * lei +
              0.007276 * ageYears * sittingHeight +
              0.02292 * weight! * (100 / height);
        }
      }
      mirwaldOffset = double.parse(mirwaldVal.toStringAsFixed(2));
      isMirwaldValid = isFemale
          ? (ageYears >= 12 && ageYears <= 14.9)
          : (ageYears >= 13 && ageYears <= 15.6);
      phvLabel = mirwaldOffset >= 0 ? 'DESDE_PHV (+)' : 'HASTA_PHV (-)';
    } else {
      mirwaldOffset = null;
      isMirwaldValid = false;
      phvLabel = 'S/D';
    }

    // 2. Schofield TMB & RCT
    final double? schofieldTmb;
    final double? rct;
    final double fa = history.activityFactor ?? 1.375;
    final double growthCost = history.growthCost ??
        (ageMonths < 3
            ? 5.6
            : (ageMonths < 6
                ? 4.4
                : (ageMonths < 12
                    ? 4.5
                    : (ageMonths < 24 ? 4.7 : 0.0))));

    if (history.schofieldTmb != null) {
      schofieldTmb = history.schofieldTmb;
      rct = history.rct ?? ((schofieldTmb ?? 0) * fa + growthCost);
    } else if (weight != null && weight > 0 && ageYears < 18) {
      final double calculatedTmb;
      if (ageYears < 3) {
        calculatedTmb = isFemale ? (58.3 * weight - 31) : (59.5 * weight - 30);
      } else if (ageYears < 10) {
        calculatedTmb = isFemale ? (22.5 * weight + 499) : (22.7 * weight + 495);
      } else {
        calculatedTmb = isFemale ? (12.2 * weight + 746) : (17.5 * weight + 651);
      }
      schofieldTmb = double.parse(calculatedTmb.toStringAsFixed(1));
      rct = double.parse((calculatedTmb * fa + growthCost).toStringAsFixed(1));
    } else {
      schofieldTmb = null;
      rct = null;
    }

    // 3. EVANUTDEP Calculations
    final double? gastricCapMl;
    final double? gastricCapOz;
    final double? dailyVolMl;
    final int feedingsCount;
    final String feedingFreq;

    if (weight != null && weight > 0) {
      gastricCapMl = history.gastricCapacityMl > 0 ? history.gastricCapacityMl : (weight * 30.0);
      gastricCapOz = gastricCapMl / 30.0;
      dailyVolMl = history.dailyFormulaVolumeMl > 0
          ? history.dailyFormulaVolumeMl
          : (weight * 150.0);
    } else {
      gastricCapMl = null;
      gastricCapOz = null;
      dailyVolMl = null;
    }

    if (ageMonths < 1) {
      feedingsCount = 8;
      feedingFreq = 'cada 2 a 3 horas';
    } else if (ageMonths < 4) {
      feedingsCount = 6;
      feedingFreq = 'cada 3 a 4 horas';
    } else if (ageMonths < 6) {
      feedingsCount = 5;
      feedingFreq = 'cada 4 a 5 horas';
    } else {
      feedingsCount = 4;
      feedingFreq = 'cada 5 a 6 horas (con sólidos)';
    }

    // 4. WHO/CDC Z-scores evaluation
    final whoIndicators = history.evaluateWhoZScores(
      ageYears: ageYears,
      ageMonths: ageMonths.toDouble(),
      isFemale: isFemale,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHeaderBanner(theme, isDark, history),
        const SizedBox(height: 16),
        _buildAntropometriaSection(
          context,
          theme,
          isDark,
          history,
          weight,
          height,
          sittingHeight,
          mirwaldOffset,
          isMirwaldValid,
          phvLabel,
          canCalculateMirwald,
          schofieldTmb,
          fa,
          growthCost,
          rct,
          ageYears,
          whoIndicators,
        ),
        const SizedBox(height: 16),
        _buildPerinatalSection(context, theme, isDark, history),
        const SizedBox(height: 16),
        _buildAlimentacionSection(
          context,
          theme,
          isDark,
          history,
          gastricCapMl,
          gastricCapOz,
          dailyVolMl,
          feedingsCount,
          feedingFreq,
        ),
        const SizedBox(height: 16),
        _buildSintomasConductaSection(context, theme, isDark, history),
        const SizedBox(height: 16),
        _buildPesRepresentanteSection(context, theme, isDark, history),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildHeaderBanner(ThemeData theme, bool isDark, PediatricHistoryModel? history) {
    final double ageYears;
    final int ageMonths;
    if (widget.patient.birthDate != null) {
      final now = DateTime.now();
      final b = widget.patient.birthDate!;
      int m = (now.year - b.year) * 12 + now.month - b.month;
      if (now.day < b.day) m = math.max(0, m - 1);
      ageMonths = m;
      ageYears = double.parse((m / 12.0).toStringAsFixed(2));
    } else if (widget.patient.age != null) {
      ageYears = widget.patient.age!.toDouble();
      ageMonths = (ageYears * 12).round();
    } else {
      ageYears = 0.0;
      ageMonths = 0;
    }

    final riskLevel = (history?.nutritionalRiskLevel ?? 'BAJO').toUpperCase();

    final Color riskColor;
    if (riskLevel == 'CRÍTICO' || riskLevel == 'CRITICO' || riskLevel == 'ALTO') {
      riskColor = AppTheme.errorRed;
    } else if (riskLevel == 'MODERADO') {
      riskColor = Colors.orange;
    } else {
      riskColor = AppTheme.successGreen;
    }

    final ageDisplay = ageMonths > 0
        ? '$ageMonths meses (${ageYears.toStringAsFixed(1)} años)'
        : (widget.patient.age != null
            ? '${widget.patient.age} años'
            : 'Edad no registrada');

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
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.child_care_rounded,
                    color: AppTheme.primaryPurple,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.patient.fullName,
                        style: GoogleFonts.montserrat(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$ageDisplay • Sexo: ${widget.patient.gender ?? "S/D"}',
                        style: GoogleFonts.montserrat(
                          fontSize: 12,
                          color: AppTheme.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                if (history != null)
                  IconButton(
                    onPressed: () => _showRegisterPediatricModal(context, history),
                    icon: const Icon(Icons.edit_note_rounded, color: AppTheme.primaryPurple, size: 26),
                    tooltip: 'Editar Historia Pediátrica',
                  ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppTheme.borderLight),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: riskColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: riskColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield_outlined, size: 14, color: riskColor),
                      const SizedBox(width: 4),
                      Text(
                        'Riesgo: $riskLevel',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: riskColor,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryPurple.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.analytics_outlined, size: 14, color: AppTheme.primaryPurple),
                      const SizedBox(width: 4),
                      Text(
                        history?.growthClassification ?? 'Zona 3 (Normal / Adecuado)',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryPurple,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAntropometriaSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
    double? weight,
    double? height,
    double? sittingHeight,
    double? mirwaldOffset,
    bool isMirwaldValid,
    String phvLabel,
    bool canCalculateMirwald,
    double? schofieldTmb,
    double fa,
    double growthCost,
    double? rct,
    double ageYears,
    List<WhoIndicatorResult> whoIndicators,
  ) {
    return _buildSectionCard(
      title: 'ANTROPOMETRÍA & INN-SISVAN',
      icon: Icons.straighten_rounded,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Peso Actual',
                weight != null ? '${weight.toStringAsFixed(1)} kg' : 'S/D',
                Icons.monitor_weight_outlined,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Talla / Longitud',
                height != null ? '${height.toStringAsFixed(1)} cm' : 'S/D',
                Icons.height_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Talla Sentado',
                sittingHeight != null ? '${sittingHeight.toStringAsFixed(1)} cm' : 'S/D',
                Icons.airline_seat_recline_normal_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Circunf. Cefálica',
                history.headCircumferenceCm != null ? '${history.headCircumferenceCm} cm' : 'S/D',
                Icons.face_retouching_natural_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Circunf. Brazo (MUAC)',
                history.midUpperArmCircumferenceCm != null
                    ? '${history.midUpperArmCircumferenceCm} cm'
                    : 'S/D',
                Icons.fitness_center_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'IMC Pediátrico',
                history.bmi != null ? '${history.bmi} kg/m²' : 'S/D',
                Icons.calculate_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Pliegue Tricipital',
                history.tricepsSkinfoldMm != null ? '${history.tricepsSkinfoldMm} mm' : 'S/D',
                Icons.compress_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Pliegue Subescap.',
                history.subscapularSkinfoldMm != null
                    ? '${history.subscapularSkinfoldMm} mm'
                    : 'S/D',
                Icons.pinch_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildMetricTile(
          'Factor Actividad (FA)',
          fa.toStringAsFixed(3),
          Icons.directions_run_rounded,
        ),
        const SizedBox(height: 14),

        // CLASIFICACIÓN NUTRICIONAL WHO/CDC (Z-SCORES)
        _buildWhoZScoreCardsSection(context, theme, isDark, whoIndicators),
        const SizedBox(height: 14),

        // Maduración Mirwald PHV
        _buildMirwaldSection(isDark, canCalculateMirwald, mirwaldOffset, isMirwaldValid, phvLabel),
        const SizedBox(height: 12),

        // Tarjeta Schofield & RCT
        _buildSchofieldSection(isDark, schofieldTmb, growthCost, rct),
        const SizedBox(height: 12),

        // Curva INN-SISVAN
        _buildInnSisvanCurveSection(isDark, history, ageYears),
      ],
    );
  }

  Widget _buildWhoZScoreCardsSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    List<WhoIndicatorResult> indicators,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.analytics_outlined, color: AppTheme.primaryPurple, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Clasificación Nutricional WHO/CDC (Z-Scores)',
                  style: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryPurple,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Evaluación automatizada cruzada según franjas antropométricas OMS / INN-SISVAN.',
            style: GoogleFonts.montserrat(
              fontSize: 11,
              color: AppTheme.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 12),
          ...indicators.map((ind) => _buildSingleWhoZScoreCard(ind, isDark)),
        ],
      ),
    );
  }

  Widget _buildSingleWhoZScoreCard(WhoIndicatorResult ind, bool isDark) {
    final Color badgeColor;
    final Color badgeBg;
    if (ind.severity == 'CRITICAL') {
      badgeColor = AppTheme.errorRed;
      badgeBg = AppTheme.errorRed.withValues(alpha: 0.12);
    } else if (ind.severity == 'WARNING') {
      badgeColor = Colors.orange;
      badgeBg = Colors.orange.withValues(alpha: 0.12);
    } else {
      badgeColor = AppTheme.successGreen;
      badgeBg = AppTheme.successGreen.withValues(alpha: 0.12);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: badgeColor.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      ind.code,
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    ind.name,
                    style: GoogleFonts.montserrat(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  ind.zScore != null
                      ? 'Z: ${ind.zScore! >= 0 ? "+" : ""}${ind.zScore} DE'
                      : ind.zoneLabel,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                ind.measuredValue != null
                    ? 'Medición: ${ind.measuredValue} ${ind.unit}'
                    : 'Medición: S/D',
                style: GoogleFonts.montserrat(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondaryLight,
                ),
              ),
              Text(
                ind.classification,
                style: GoogleFonts.montserrat(
                  fontSize: 11.5,
                  fontWeight: FontWeight.bold,
                  color: badgeColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            ind.clinicalNote,
            style: GoogleFonts.montserrat(
              fontSize: 10.5,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMirwaldSection(
    bool isDark,
    bool canCalculateMirwald,
    double? mirwaldOffset,
    bool isMirwaldValid,
    String phvLabel,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFBBF7D0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.trending_up_rounded, color: AppTheme.successGreen, size: 20),
              const SizedBox(width: 8),
              Text(
                'Maduración Biológica — Mirwald PHV',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF166534),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (canCalculateMirwald && mirwaldOffset != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Maturity Offset',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        color: AppTheme.textSecondaryLight,
                      ),
                    ),
                    Text(
                      '${mirwaldOffset >= 0 ? "+" : ""}$mirwaldOffset años',
                      style: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (mirwaldOffset >= 0 ? AppTheme.primaryPurple : Colors.teal)
                        .withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    phvLabel,
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: mirwaldOffset >= 0 ? AppTheme.primaryPurple : Colors.teal,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              isMirwaldValid
                  ? 'Rango etario validado para el modelo predictivo de Mirwald (2002).'
                  : 'Nota: Edad fuera de la ventana estricta de validación Mirwald (12-15.6a).',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontStyle: FontStyle.italic,
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
            ),
          ] else ...[
            Text(
              'Para calcular la maduración biológica Mirwald PHV, registre el peso, la talla y la talla sentado del paciente.',
              style: GoogleFonts.montserrat(
                fontSize: 11.5,
                color: AppTheme.textSecondaryLight,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSchofieldSection(
    bool isDark,
    double? schofieldTmb,
    double growthCost,
    double? rct,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF5F3FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFDDD6FE),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_fire_department_rounded, color: AppTheme.primaryPurple, size: 20),
              const SizedBox(width: 8),
              Text(
                'Requerimiento Calórico (Schofield & FAO/WHO)',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryPurple,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (schofieldTmb != null && rct != null) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('TMB Schofield',
                          style: GoogleFonts.montserrat(
                              fontSize: 11, color: AppTheme.textSecondaryLight)),
                      Text('${schofieldTmb.toStringAsFixed(1)} kcal',
                          style: GoogleFonts.montserrat(
                              fontSize: 14.5, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Costo Crecim.',
                          style: GoogleFonts.montserrat(
                              fontSize: 11, color: AppTheme.textSecondaryLight)),
                      Text('${growthCost.toStringAsFixed(1)} kcal',
                          style: GoogleFonts.montserrat(
                              fontSize: 14.5, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('RCT Total',
                          style: GoogleFonts.montserrat(
                              fontSize: 11, color: AppTheme.textSecondaryLight)),
                      Text('${rct.toStringAsFixed(1)} kcal',
                          style: GoogleFonts.montserrat(
                              fontSize: 15.5,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryPurple)),
                    ],
                  ),
                ),
              ],
            ),
          ] else ...[
            Text(
              'Registre el peso actual del paciente para calcular la Tasa Metabólica Basal por Schofield y el Requerimiento Calórico Total.',
              style: GoogleFonts.montserrat(
                fontSize: 11.5,
                color: AppTheme.textSecondaryLight,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInnSisvanCurveSection(
    bool isDark,
    PediatricHistoryModel history,
    double ageYears,
  ) {
    final defaultChart = ageYears < 2 ? 'ACOSTADO (Decúbito Supino)' : 'DE_PIE (Bipedestación)';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFBAE6FD),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.stacked_bar_chart_rounded, color: Colors.blueAccent, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Curva INN-SISVAN / OMS',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    color: AppTheme.textSecondaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  history.growthClassification ?? 'Zona 3 — Normal / Adecuado (-2 a +2 DE)',
                  style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Tipo de gráfica: ${history.growthChartType ?? defaultChart}',
                  style: GoogleFonts.montserrat(fontSize: 11, color: Colors.blueGrey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPerinatalSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
  ) {
    final gestWeeks = history.gestationalAgeWeeks;
    final termStr = gestWeeks != null
        ? (gestWeeks >= 37 ? '$gestWeeks sem (A Término)' : '$gestWeeks sem (Pretérmino)')
        : 'S/D';

    return _buildSectionCard(
      title: 'PERINATALES & DESARROLLO',
      icon: Icons.child_friendly_rounded,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Edad Gestacional',
                termStr,
                Icons.calendar_month_outlined,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Peso al Nacer',
                history.birthWeightKg != null ? '${history.birthWeightKg} kg' : 'S/D',
                Icons.scale_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Longitud al Nacer',
                history.birthLengthCm != null ? '${history.birthLengthCm} cm' : 'S/D',
                Icons.straighten_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'CC al Nacer',
                history.birthHeadCircumferenceCm != null
                    ? '${history.birthHeadCircumferenceCm} cm'
                    : 'S/D',
                Icons.circle_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildMetricTile(
          'Puntaje APGAR',
          history.apgarScore != null && history.apgarScore!.isNotEmpty
              ? history.apgarScore!
              : 'S/D',
          Icons.health_and_safety_outlined,
        ),
        const SizedBox(height: 12),
        _buildInfoBox(
          label: 'Complicaciones al Parto',
          value: history.birthComplications != null && history.birthComplications!.isNotEmpty
              ? history.birthComplications!
              : 'Sin complicaciones perinatales reportadas.',
          icon: Icons.warning_amber_rounded,
        ),
        const SizedBox(height: 10),
        _buildInfoBox(
          label: 'Hitos del Desarrollo Psicomotor',
          value: history.developmentalMilestones != null &&
                  history.developmentalMilestones!.isNotEmpty
              ? history.developmentalMilestones!
              : 'Desarrollo psicomotor acorde a la edad cronológica.',
          icon: Icons.psychology_outlined,
        ),
      ],
    );
  }

  Widget _buildAlimentacionSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
    double? gastricCapMl,
    double? gastricCapOz,
    double? dailyVolMl,
    int feedingsCount,
    String feedingFreq,
  ) {
    return _buildSectionCard(
      title: 'ALIMENTACIÓN & FÓRMULAS LÁCTEAS',
      icon: Icons.water_drop_rounded,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Lactancia Materna',
                history.breastfeedingType ?? 'S/D',
                Icons.favorite_outline_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Duración Lactancia',
                history.breastfeedingDurationMonths != null
                    ? '${history.breastfeedingDurationMonths} meses'
                    : 'S/D',
                Icons.schedule_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Alimentación Complem.',
                history.complementaryFeedingStartMonths != null
                    ? 'Desde ${history.complementaryFeedingStartMonths} meses'
                    : 'S/D',
                Icons.restaurant_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Alérgenos',
                history.allergenIntroductionDetails ?? 'Sin detalles',
                Icons.warning_amber_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Dosificación EVANUTDEP
        if (gastricCapMl != null && dailyVolMl != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFFBBF7D0),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calculate_rounded, color: Colors.teal, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Dosificación EVANUTDEP (Fórmulas Lácteas)',
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal[800],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Capacidad Gástrica',
                              style: GoogleFonts.montserrat(
                                  fontSize: 11, color: AppTheme.textSecondaryLight)),
                          Text('${gastricCapMl.toStringAsFixed(0)} ml',
                              style: GoogleFonts.montserrat(
                                  fontSize: 15, fontWeight: FontWeight.bold)),
                          Text('≈ ${gastricCapOz?.toStringAsFixed(1) ?? "-"} oz (Peso × 30)',
                              style: GoogleFonts.montserrat(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Volumen Diario',
                              style: GoogleFonts.montserrat(
                                  fontSize: 11, color: AppTheme.textSecondaryLight)),
                          Text('${dailyVolMl.toStringAsFixed(0)} ml/día',
                              style: GoogleFonts.montserrat(
                                  fontSize: 15, fontWeight: FontWeight.bold)),
                          Text('150 ml/kg/día',
                              style: GoogleFonts.montserrat(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Divider(height: 1, color: AppTheme.borderLight),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.alarm_on_rounded, size: 16, color: Colors.teal),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Sugerido: $feedingsCount tomas diarias ($feedingFreq). Dilución: 1 medida por cada onza (30 ml) de agua.',
                        style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFFBBF7D0),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 20, color: Colors.teal),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Registre el peso actual del paciente para habilitar la calculadora EVANUTDEP de capacidad gástrica funcional (Peso × 30 ml) y volumen diario (150 ml/kg).',
                    style: GoogleFonts.montserrat(fontSize: 11.5, color: Colors.teal[900]),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 14),

        // Fórmulas Registradas
        Text(
          'FÓRMULAS LÁCTEAS PRESCRITAS',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        if (history.infantFormulas.isEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F2937) : Colors.grey[50],
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 18, color: Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No hay fórmulas lácteas prescritas registradas en el expediente.',
                    style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                  ),
                ),
              ],
            ),
          )
        else
          ...history.infantFormulas.map((f) => Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            f.formulaType ?? 'Fórmula Infantil',
                            style: GoogleFonts.montserrat(
                                fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                          if (f.feedingFrequency != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${f.feedingFrequency} tomas/día',
                                style: GoogleFonts.montserrat(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryPurple,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Capacidad: ${f.capacityMl?.toStringAsFixed(0) ?? "-"} ml • Vol. Diario: ${f.dailyVolumeMl?.toStringAsFixed(0) ?? "-"} ml • Densidad: ${f.densityKcalPerMl?.toStringAsFixed(2) ?? "-"} kcal/ml',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          color: AppTheme.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              )),
      ],
    );
  }

  Widget _buildSintomasConductaSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
  ) {
    return _buildSectionCard(
      title: 'SÍNTOMAS GI & CONDUCTA',
      icon: Icons.healing_rounded,
      children: [
        Text(
          'SÍNTOMAS GASTROINTESTINALES REPORTADOS',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        if (history.giSymptoms.isEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F2937) : Colors.grey[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline_rounded,
                    size: 16, color: AppTheme.successGreen),
                const SizedBox(width: 8),
                Text(
                  'Sin síntomas gastrointestinales reportados.',
                  style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                ),
              ],
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: history.giSymptoms.map((sym) {
              return Chip(
                avatar: const Icon(Icons.report_problem_outlined,
                    size: 14, color: AppTheme.primaryPurple),
                label: Text(sym,
                    style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.w600)),
                backgroundColor: AppTheme.primaryPurple.withValues(alpha: 0.08),
                side: BorderSide(color: AppTheme.primaryPurple.withValues(alpha: 0.2)),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
              );
            }).toList(),
          ),
        const SizedBox(height: 14),

        // Escala Bristol
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Escala Bristol Heces',
                history.bristolStoolType != null ? 'Tipo ${history.bristolStoolType}' : 'S/D',
                Icons.water_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Frecuencia Evacuatoria',
                history.bowelFrequency ?? 'S/D',
                Icons.repeat_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildInfoBox(
          label: 'Examen Físico Nutricional (NFPE)',
          value: history.clinicalFindings != null && history.clinicalFindings!.isNotEmpty
              ? history.clinicalFindings!
              : 'Sin alteraciones mucocutáneas o signos de déficit de micronutrientes.',
          icon: Icons.medical_services_outlined,
        ),
        const SizedBox(height: 14),

        // Conducta & Estilo de Vida
        Text(
          'CONDUCTA & ESTILO DE VIDA',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Come en Familia',
                history.eatsWithFamily == true ? 'Sí' : 'No',
                Icons.family_restroom_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Come con Pantallas',
                history.eatsWithScreens == true ? 'Sí (Alerta)' : 'No',
                Icons.tv_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                'Horas de Sueño',
                history.sleepHours != null ? '${history.sleepHours} hrs' : 'S/D',
                Icons.bedtime_outlined,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricTile(
                'Pantallas / Día',
                history.screenTimeHoursPerDay != null
                    ? '${history.screenTimeHoursPerDay} hrs'
                    : 'S/D',
                Icons.devices_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildMetricTile(
          'Actividad Física Estructurada',
          history.structuredPhysicalActivity ?? 'Juego activo libre',
          Icons.sports_soccer_rounded,
        ),
      ],
    );
  }

  Widget _buildPesRepresentanteSection(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    PediatricHistoryModel history,
  ) {
    final repPhone = history.representativePhone ?? widget.patient.phone;
    final repWhatsapp = history.representativeWhatsappUrl ?? widget.patient.whatsappUrl;

    return _buildSectionCard(
      title: 'DIAGNÓSTICO PES & REPRESENTANTE',
      icon: Icons.assignment_turned_in_rounded,
      children: [
        _buildInfoBox(
          label: 'Diagnóstico Nutricional PES',
          value: history.pesDiagnosis != null && history.pesDiagnosis!.isNotEmpty
              ? history.pesDiagnosis!
              : 'Sin diagnóstico PES registrado.',
          icon: Icons.assignment_outlined,
        ),
        const SizedBox(height: 10),
        _buildInfoBox(
          label: 'Prioridades de Intervención',
          value: history.interventionPriorities != null &&
                  history.interventionPriorities!.isNotEmpty
              ? history.interventionPriorities!
              : 'Monitoreo periódico del crecimiento y desarrollo.',
          icon: Icons.flag_outlined,
        ),
        const SizedBox(height: 16),

        Text(
          'REPRESENTANTE & CONTACTO',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.person_pin_rounded,
                        color: AppTheme.primaryPurple, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          history.representativeName ?? 'Representante no registrado',
                          style: GoogleFonts.montserrat(
                              fontSize: 14, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Parentesco: ${history.representativeRelationship ?? "Tutor legal"}',
                          style: GoogleFonts.montserrat(
                              fontSize: 12, color: AppTheme.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (history.cohabitants != null && history.cohabitants!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  'Convivientes: ${history.cohabitants}',
                  style: GoogleFonts.montserrat(
                      fontSize: 11, color: AppTheme.textSecondaryLight),
                ),
              ],
              if (repPhone != null && repPhone.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Teléfono: $repPhone',
                  style: GoogleFonts.montserrat(
                      fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],
              if (history.representativeEmail != null &&
                  history.representativeEmail!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  'Email: ${history.representativeEmail}',
                  style: GoogleFonts.montserrat(
                      fontSize: 12, color: AppTheme.textSecondaryLight),
                ),
              ],
              const SizedBox(height: 14),
              const Divider(height: 1, color: AppTheme.borderLight),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: repWhatsapp.isNotEmpty
                          ? () => _openWhatsApp(repWhatsapp)
                          : null,
                      icon: const Icon(Icons.chat_rounded, size: 16),
                      label: Text(
                        'WhatsApp',
                        style: GoogleFonts.montserrat(
                            fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryPurple,
                        side: const BorderSide(color: AppTheme.primaryPurple),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: repPhone != null && repPhone.isNotEmpty
                          ? () => _makePhoneCall(repPhone)
                          : null,
                      icon: const Icon(Icons.phone_rounded, size: 16),
                      label: Text(
                        'Llamar',
                        style: GoogleFonts.montserrat(
                            fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppTheme.primaryPurple, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: AppTheme.primaryPurple,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryPurple),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.montserrat(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBox({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.softPurpleChip.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: AppTheme.primaryPurple),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryPurple,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showRegisterPediatricModal(
    BuildContext context,
    PediatricHistoryModel? existingHistory,
  ) async {
    final nameCtrl =
        TextEditingController(text: existingHistory?.representativeName ?? '');
    final phoneCtrl = TextEditingController(
        text: existingHistory?.representativePhone ?? widget.patient.phone ?? '');
    final relCtrl =
        TextEditingController(text: existingHistory?.representativeRelationship ?? 'Madre');
    final emailCtrl = TextEditingController(
        text: existingHistory?.representativeEmail ?? widget.patient.email ?? '');
    final weightCtrl =
        TextEditingController(text: existingHistory?.weightKg?.toString() ?? '');
    final heightCtrl =
        TextEditingController(text: existingHistory?.heightCm?.toString() ?? '');
    final gestCtrl = TextEditingController(
        text: existingHistory?.gestationalAgeWeeks?.toString() ?? '39');
    final pesCtrl =
        TextEditingController(text: existingHistory?.pesDiagnosis ?? '');
    final milestonesCtrl =
        TextEditingController(text: existingHistory?.developmentalMilestones ?? '');

    String selectedRisk = existingHistory?.nutritionalRiskLevel ?? 'BAJO';
    String selectedLactation = existingHistory?.breastfeedingType ?? 'Exclusiva';
    bool isSaving = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          existingHistory == null
                              ? 'Registrar Historia Pediátrica'
                              : 'Editar Historia Pediátrica',
                          style: GoogleFonts.montserrat(
                              fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text(
                      'DATOS DEL REPRESENTANTE',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Nombre y Apellido',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: phoneCtrl,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Teléfono / WhatsApp',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: relCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Parentesco',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Correo Electrónico',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'MÉTRICAS ANTROPOMÉTRICAS INICIALES',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: weightCtrl,
                            keyboardType:
                                const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Peso Actual (kg)',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: heightCtrl,
                            keyboardType:
                                const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Talla (cm)',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: gestCtrl,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Edad Gestacional (Semanas)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'LACTANCIA Y RIESGO NUTRICIONAL',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedLactation,
                            decoration: const InputDecoration(
                              labelText: 'Tipo Lactancia',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: const [
                              DropdownMenuItem(value: 'Exclusiva', child: Text('Exclusiva')),
                              DropdownMenuItem(value: 'Mixta', child: Text('Mixta')),
                              DropdownMenuItem(value: 'Fórmula', child: Text('Fórmula')),
                              DropdownMenuItem(value: 'Destete', child: Text('Destete')),
                            ],
                            onChanged: (val) {
                              if (val != null) {
                                setModalState(() => selectedLactation = val);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedRisk,
                            decoration: const InputDecoration(
                              labelText: 'Riesgo Nutricional',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: const [
                              DropdownMenuItem(value: 'BAJO', child: Text('BAJO')),
                              DropdownMenuItem(value: 'MODERADO', child: Text('MODERADO')),
                              DropdownMenuItem(value: 'ALTO', child: Text('ALTO')),
                              DropdownMenuItem(value: 'CRÍTICO', child: Text('CRÍTICO')),
                            ],
                            onChanged: (val) {
                              if (val != null) {
                                setModalState(() => selectedRisk = val);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: pesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Diagnóstico PES / Observaciones',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: milestonesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Hitos del Desarrollo Psicomotor',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryPurple,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: isSaving
                            ? null
                            : () async {
                                setModalState(() => isSaving = true);
                                final weightVal = double.tryParse(weightCtrl.text);
                                final heightVal = double.tryParse(heightCtrl.text);
                                final gestVal = double.tryParse(gestCtrl.text);

                                final modelToSave = PediatricHistoryModel(
                                  id: existingHistory?.id ?? '',
                                  patientId: widget.patient.id,
                                  representativeName: nameCtrl.text.trim().isNotEmpty
                                      ? nameCtrl.text.trim()
                                      : null,
                                  representativePhone: phoneCtrl.text.trim().isNotEmpty
                                      ? phoneCtrl.text.trim()
                                      : null,
                                  representativeRelationship: relCtrl.text.trim().isNotEmpty
                                      ? relCtrl.text.trim()
                                      : null,
                                  representativeEmail: emailCtrl.text.trim().isNotEmpty
                                      ? emailCtrl.text.trim()
                                      : null,
                                  weightKg: weightVal,
                                  heightCm: heightVal,
                                  sittingHeightCm: heightVal != null
                                      ? double.parse((heightVal * 0.55).toStringAsFixed(1))
                                      : null,
                                  gestationalAgeWeeks: gestVal,
                                  breastfeedingType: selectedLactation,
                                  nutritionalRiskLevel: selectedRisk,
                                  pesDiagnosis: pesCtrl.text.trim().isNotEmpty
                                      ? pesCtrl.text.trim()
                                      : null,
                                  developmentalMilestones: milestonesCtrl.text.trim().isNotEmpty
                                      ? milestonesCtrl.text.trim()
                                      : null,
                                  growthClassification:
                                      existingHistory?.growthClassification ?? 'ZONA_3',
                                  giSymptoms: existingHistory?.giSymptoms ?? const [],
                                  bristolStoolType: existingHistory?.bristolStoolType ?? 4,
                                );

                                final messenger = ScaffoldMessenger.of(context);
                                await _clinicalService.savePediatricHistory(modelToSave);
                                if (ctx.mounted) {
                                  Navigator.of(ctx).pop();
                                }
                                if (mounted) {
                                  _refresh();
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content:
                                          Text('Historia pediátrica guardada con éxito.'),
                                      backgroundColor: AppTheme.successGreen,
                                    ),
                                  );
                                }
                              },
                        child: isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                existingHistory == null
                                    ? 'Guardar Expediente Pediátrico'
                                    : 'Actualizar Expediente Pediátrico',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
