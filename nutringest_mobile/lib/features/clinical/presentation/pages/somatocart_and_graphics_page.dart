import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/anthropometry_model.dart';
import '../../providers/clinical_provider.dart';
import '../../utils/isak_calculator.dart';
import '../widgets/somatocart_painter.dart';
import 'anthropometry_form_page.dart';

/// Kombai Screen 13 (var_244b7c67cce5): Somatocarta Oficial & Gráficos de Evolución Body Composition
class SomatocartAndGraphicsPage extends StatefulWidget {
  final PatientModel patient;

  const SomatocartAndGraphicsPage({super.key, required this.patient});

  @override
  State<SomatocartAndGraphicsPage> createState() => _SomatocartAndGraphicsPageState();
}

class _SomatocartAndGraphicsPageState extends State<SomatocartAndGraphicsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ClinicalProvider>().fetchAnthropometryHistory(widget.patient.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final clinicalProvider = context.watch<ClinicalProvider>();
    final history = clinicalProvider.history;
    final isLoading = clinicalProvider.isLoading;

    final latest = clinicalProvider.latestMeasurement;
    final latestIsak = latest?.isakResult;

    // Convertir historial a puntos para Somatocarta
    final somatocartPoints = history.map((item) {
      final res = item.isakResult;
      final dateStr = '${item.date.day}/${item.date.month}/${item.date.year}';
      return SomatocartPoint(
        x: res.x,
        y: res.y,
        label: dateStr,
        date: item.date,
        category: res.somatotypeCategory,
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Somatocarta & Composición',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Nueva Medición ISAK',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AnthropometryFormPage(patient: widget.patient),
                ),
              );
            },
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => clinicalProvider.fetchAnthropometryHistory(widget.patient.id),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Banner Paciente
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.patient.fullName,
                            style: GoogleFonts.montserrat(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          Text(
                            'Expediente de Evaluación Antropométrica',
                            style: GoogleFonts.montserrat(
                              fontSize: 12,
                              color: AppTheme.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => AnthropometryFormPage(patient: widget.patient),
                            ),
                          );
                        },
                        icon: const Icon(Icons.straighten_rounded, size: 16),
                        label: const Text('+ Medición', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 1. Somatocarta de Heath-Carter (CustomPainter)
                  Text(
                    'SOMATOCARTA DE HEATH-CARTER',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: AppTheme.primaryPurple,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SomatocartWidget(
                    points: somatocartPoints,
                    height: 380,
                  ),
                  const SizedBox(height: 16),

                  // 2. Card de Componentes Somatotípicos Actuales
                  if (latestIsak != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'CLASIFICACIÓN SOMATOTÍPICA',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                    color: AppTheme.textSecondaryLight,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryPurple,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    latestIsak.somatotypeCategory,
                                    style: GoogleFonts.montserrat(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildComponentTile(
                                    'ENDOMORFIA',
                                    latestIsak.endomorphy.toStringAsFixed(1),
                                    'Adiposidad Relativa',
                                    Colors.orange.shade700,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _buildComponentTile(
                                    'MESOMORFIA',
                                    latestIsak.mesomorphy.toStringAsFixed(1),
                                    'Robustez Muscular',
                                    AppTheme.primaryPurple,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _buildComponentTile(
                                    'ECTOMORFIA',
                                    latestIsak.ectomorphy.toStringAsFixed(1),
                                    'Linealidad Relativa',
                                    Colors.teal,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(height: 1, color: AppTheme.borderLight),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Coordenadas Somatocarta: X = ${latestIsak.x}, Y = ${latestIsak.y}',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                ),
                                Text(
                                  '∑6 Pliegues: ${latestIsak.sum6} mm',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 3. Gráficos de Barra / Progreso de Evolución Composición Corporal
                  Text(
                    'EVOLUCIÓN DE COMPOSICIÓN CORPORAL',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (latestIsak != null) _buildEvolutionBarCard(latestIsak, latest!),

                  const SizedBox(height: 16),

                  // 4. Historial Completo de Mediciones
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'HISTORIAL DE EVALUACIONES (${history.length})',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                          color: AppTheme.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (history.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Center(
                          child: Text(
                            'No hay evaluaciones registradas para este paciente.',
                            style: GoogleFonts.montserrat(fontSize: 13, color: AppTheme.textSecondaryLight),
                          ),
                        ),
                      ),
                    )
                  else
                    ...history.map((m) {
                      final isak = m.isakResult;
                      final dateStr = '${m.date.day}/${m.date.month}/${m.date.year}';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.softPurpleChip,
                            child: const Icon(Icons.straighten_rounded, color: AppTheme.primaryPurple, size: 20),
                          ),
                          title: Text(
                            'Evaluación del $dateStr',
                            style: GoogleFonts.montserrat(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Text(
                              'Peso: ${m.weight} kg  •  Grasa: ${isak.fatPercentage}%  •  Músculo: ${isak.musclePercentage}%\nSomatotipo: ${isak.somatotypeCategory}',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                color: AppTheme.textSecondaryLight,
                              ),
                            ),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.edit_outlined, color: AppTheme.primaryPurple, size: 20),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AnthropometryFormPage(
                                    patient: widget.patient,
                                    initialMeasurement: m,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildComponentTile(String title, String val, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(
            title,
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            val,
            style: GoogleFonts.montserrat(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: GoogleFonts.montserrat(
              fontSize: 9,
              color: AppTheme.textSecondaryLight,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildEvolutionBarCard(IsakResult isakResult, AnthropometryModel model) {
    final fatPct = (isakResult.fatPercentage / 100.0).clamp(0.0, 1.0);
    final musclePct = (isakResult.musclePercentage / 100.0).clamp(0.0, 1.0);
    final bonePct = (isakResult.boneKg / model.weight).clamp(0.0, 1.0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'FRACCIONAMIENTO QUÍMICO Y TISULAR',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: AppTheme.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 14),

            // Masa Grasa
            _buildProgressBar(
              label: 'Masa Grasa (% Fat - Yuhasz)',
              percentageStr: '${isakResult.fatPercentage}% (${isakResult.fatKg} kg)',
              progress: fatPct,
              color: AppTheme.accentPurple,
            ),
            const SizedBox(height: 12),

            // Masa Muscular
            _buildProgressBar(
              label: 'Masa Muscular (% Lee 2000)',
              percentageStr: '${isakResult.musclePercentage}% (${isakResult.muscleKg} kg)',
              progress: musclePct,
              color: AppTheme.successGreen,
            ),
            const SizedBox(height: 12),

            // Masa Ósea
            _buildProgressBar(
              label: 'Masa Ósea (Rocha)',
              percentageStr: '${(bonePct * 100).toStringAsFixed(1)}% (${isakResult.boneKg} kg)',
              progress: bonePct,
              color: Colors.amber.shade700,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar({
    required String label,
    required String percentageStr,
    required double progress,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              percentageStr,
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 10,
            backgroundColor: color.withValues(alpha: 0.15),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}
