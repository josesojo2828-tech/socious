import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/portion_distribution_model.dart';
import '../../providers/nutrition_provider.dart';

/// Pantalla 8 Kombai (`var_b4f64249cabf`) - Asignador de Raciones de Intercambio
class PortionAssignerPage extends StatefulWidget {
  final PatientModel patient;

  const PortionAssignerPage({super.key, required this.patient});

  @override
  State<PortionAssignerPage> createState() => _PortionAssignerPageState();
}

class _PortionAssignerPageState extends State<PortionAssignerPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionProvider>().loadPatientNutritionData(widget.patient.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<NutritionProvider>();
    final dist = provider.currentDistribution;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Matriz de Raciones - ${widget.patient.fullName}',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: provider.isLoading || dist == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Header Explicativo
                Container(
                  padding: const EdgeInsets.all(16),
                  color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppTheme.primaryPurple, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Ajusta las raciones diarias de intercambio. El total calórico y los macronutrientes se recalcularán automáticamente en tiempo real.',
                          style: GoogleFonts.montserrat(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Matriz de Grupos de Alimentos
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: PortionDistributionModel.groupConfigs.entries.map((entry) {
                      final key = entry.key;
                      final config = entry.value;
                      final currentPortions = dist.getPortionsCount(key);

                      final kcalGroup = config.kcalPerPortion * currentPortions;
                      final protGroup = config.proteinPerPortion * currentPortions;
                      final fatGroup = config.fatPerPortion * currentPortions;
                      final carbGroup = config.carbsPerPortion * currentPortions;

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
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          config.label,
                                          style: GoogleFonts.montserrat(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: theme.colorScheme.onSurface,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Ref: ${config.referenceUnit}',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 11.5,
                                            color: AppTheme.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Incrementar / Decrementar Controls
                                  Row(
                                    children: [
                                      IconButton.filledTonal(
                                        style: IconButton.styleFrom(
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                        ),
                                        onPressed: currentPortions > 0
                                            ? () => provider.updatePortion(key, -1)
                                            : null,
                                        icon: const Icon(Icons.remove, size: 18),
                                      ),
                                      Container(
                                        constraints: const BoxConstraints(minWidth: 36),
                                        alignment: Alignment.center,
                                        child: Text(
                                          '$currentPortions',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryPurple,
                                          ),
                                        ),
                                      ),
                                      IconButton.filled(
                                        style: IconButton.styleFrom(
                                          backgroundColor: AppTheme.primaryPurple,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                        ),
                                        onPressed: () => provider.updatePortion(key, 1),
                                        icon: const Icon(Icons.add, size: 18, color: Colors.white),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              const Divider(height: 1, color: AppTheme.borderLight),
                              const SizedBox(height: 8),

                              // Desglose Acumulado por Grupo
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${kcalGroup.toStringAsFixed(0)} Kcal acumuladas',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryPurple,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      'P: ${protGroup.toStringAsFixed(0)}g  |  G: ${fatGroup.toStringAsFixed(0)}g  |  C: ${carbGroup.toStringAsFixed(0)}g',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w500,
                                        color: AppTheme.textSecondaryLight,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                // Resumen Dinámico Sticky Bottom Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.cardTheme.color,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'TOTAL ACUMULADO DIARIO',
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
                            Text(
                              '${dist.totalKcal.toStringAsFixed(0)} Kcal',
                              style: GoogleFonts.montserrat(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryPurple,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Chips de Macros Sticky
                        Row(
                          children: [
                            Expanded(
                              child: _buildStickyMacroChip(
                                label: 'Proteínas',
                                value: '${dist.totalProtein.toStringAsFixed(1)}g',
                                color: const Color(0xFFE17055),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildStickyMacroChip(
                                label: 'Grasas',
                                value: '${dist.totalFat.toStringAsFixed(1)}g',
                                color: const Color(0xFFFDCB6E),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildStickyMacroChip(
                                label: 'Carbohidratos',
                                value: '${dist.totalCarbs.toStringAsFixed(1)}g',
                                color: const Color(0xFF0984E3),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Botón Guardar
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryPurple,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () async {
                              final success = await provider.saveCurrentPortionDistribution();
                              if (context.mounted) {
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Matriz de raciones actualizada exitosamente.'),
                                      backgroundColor: AppTheme.successGreen,
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                  Navigator.of(context).pop();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(provider.errorMessage ?? 'Error al guardar raciones.'),
                                      backgroundColor: Colors.redAccent,
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              }
                            },
                            icon: const Icon(Icons.check_circle_outline_rounded, size: 20, color: Colors.white),
                            label: Text(
                              'Guardar Distribución de Raciones',
                              style: GoogleFonts.montserrat(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStickyMacroChip({
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
