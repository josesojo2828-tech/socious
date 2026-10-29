import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/nutritional_plan_model.dart';
import '../../providers/nutrition_provider.dart';
import 'food_catalog_page.dart';
import 'portion_assigner_page.dart';

/// Pantalla 9 Kombai (`var_ab7cad74846f`) - Visor de Plan Nutricional & Dietas
class NutritionalPlanViewerPage extends StatefulWidget {
  final PatientModel patient;

  const NutritionalPlanViewerPage({super.key, required this.patient});

  @override
  State<NutritionalPlanViewerPage> createState() => _NutritionalPlanViewerPageState();
}

class _NutritionalPlanViewerPageState extends State<NutritionalPlanViewerPage> {
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

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Plan Nutricional - ${widget.patient.fullName}',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.grid_view_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Asignador de Raciones',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PortionAssignerPage(patient: widget.patient),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.menu_book_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Catálogo de Alimentos',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const FoodCatalogPage(),
                ),
              );
            },
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.activePlan == null
              ? _buildEmptyState()
              : _buildPlanViewer(provider, theme),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.restaurant_menu_rounded, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'Sin plan nutricional activo',
            style: GoogleFonts.montserrat(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'El paciente aún no posee una dieta configurada.',
            style: GoogleFonts.montserrat(color: AppTheme.textSecondaryLight),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanViewer(NutritionProvider provider, ThemeData theme) {
    final plan = provider.activePlan!;
    final dayPlan = provider.currentDayPlan;

    final providedKcal = dayPlan?.totalKcal ?? 0.0;
    final targetKcal = plan.targetKcal;
    final progress = targetKcal > 0 ? (providedKcal / targetKcal).clamp(0.0, 1.0) : 0.0;

    final providedProt = dayPlan?.totalProtein ?? 0.0;
    final providedFat = dayPlan?.totalFat ?? 0.0;
    final providedCarbs = dayPlan?.totalCarbs ?? 0.0;

    return Column(
      children: [
        // 1. Selector Horizontal de Días (Lunes - Domingo)
        Container(
          height: 54,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: theme.cardTheme.color,
            border: const Border(bottom: BorderSide(color: AppTheme.borderLight)),
          ),
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: NutritionProvider.weekDays.length,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemBuilder: (context, index) {
              final day = NutritionProvider.weekDays[index];
              final isSelected = index == provider.selectedDayIndex;

              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(day),
                  selected: isSelected,
                  onSelected: (_) => provider.selectDay(index),
                  selectedColor: AppTheme.primaryPurple,
                  labelStyle: GoogleFonts.montserrat(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : theme.colorScheme.onSurface,
                  ),
                  backgroundColor: theme.scaffoldBackgroundColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected ? AppTheme.primaryPurple : AppTheme.borderLight,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // 2. Card de Resumen y Progreso de Kcal + Macros Chips
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              plan.title,
                              style: GoogleFonts.montserrat(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.successGreen.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              'ACTIVO',
                              style: GoogleFonts.montserrat(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.successGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Kcal Goal vs Provided Progress Bar
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              'Calorías Aportadas: ${providedKcal.toStringAsFixed(0)} Kcal',
                              style: GoogleFonts.montserrat(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryPurple,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Objetivo: ${targetKcal.toStringAsFixed(0)} Kcal',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textSecondaryLight,
                              ),
                              textAlign: TextAlign.end,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 10,
                          backgroundColor: AppTheme.primaryPurple.withValues(alpha: 0.15),
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryPurple),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Chips de Macronutrientes
                      Row(
                        children: [
                          Expanded(
                            child: _buildMacroChip(
                              label: 'Proteínas',
                              value: '${providedProt.toStringAsFixed(1)}g',
                              target: '${plan.targetProtein.toStringAsFixed(0)}g',
                              color: const Color(0xFFE17055),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildMacroChip(
                              label: 'Grasas',
                              value: '${providedFat.toStringAsFixed(1)}g',
                              target: '${plan.targetFat.toStringAsFixed(0)}g',
                              color: const Color(0xFFFDCB6E),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildMacroChip(
                              label: 'Carbos',
                              value: '${providedCarbs.toStringAsFixed(1)}g',
                              target: '${plan.targetCarbs.toStringAsFixed(0)}g',
                              color: const Color(0xFF0984E3),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              if (plan.nutritionistNotes != null && plan.nutritionistNotes!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.edit_note_rounded, color: AppTheme.primaryPurple, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Indicaciones: ${plan.nutritionistNotes}',
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
              ],

              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'TIEMPOS DE COMIDA - ${provider.selectedDayName.toUpperCase()}',
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
                    '${dayPlan?.mealTimes.length ?? 0} comidas',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryPurple,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // 3. Lista de Tiempos de Comida con Alimentos
              if (dayPlan == null || dayPlan.mealTimes.isEmpty) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Center(
                      child: Text(
                        'No hay comidas programadas para el ${provider.selectedDayName}.',
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          color: AppTheme.textSecondaryLight,
                        ),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                ...dayPlan.mealTimes.map((mealTime) => _buildMealTimeCard(mealTime, theme)),
              ],

              const SizedBox(height: 16),
              // Botones de Accesos Rápidos FASE 4
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PortionAssignerPage(patient: widget.patient),
                          ),
                        );
                      },
                      icon: const Icon(Icons.grid_view_rounded, size: 18, color: Colors.white),
                      label: Flexible(
                        child: Text(
                          'Asignar Raciones',
                          style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const FoodCatalogPage(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.search_rounded, size: 18),
                      label: Flexible(
                        child: Text(
                          'Catálogo Alimentos',
                          style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
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

  Widget _buildMacroChip({
    required String label,
    required String value,
    required String target,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'Obj: $target',
            style: GoogleFonts.montserrat(
              fontSize: 10,
              color: AppTheme.textSecondaryLight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMealTimeCard(MealTimeModel mealTime, ThemeData theme) {
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
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.access_time_filled_rounded,
                          color: AppTheme.primaryPurple,
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          mealTime.name,
                          style: GoogleFonts.montserrat(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '(${mealTime.suggestedTime} hs)',
                        style: GoogleFonts.montserrat(
                          fontSize: 12,
                          color: AppTheme.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${mealTime.totalKcal.toStringAsFixed(0)} Kcal',
                  style: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryPurple,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: AppTheme.borderLight),
            const SizedBox(height: 10),

            // Items de alimentos
            ...mealTime.items.map((item) {
              final itemKcal = item.kcal * item.quantity;
              final itemProt = item.protein * item.quantity;
              final itemFat = item.fat * item.quantity;
              final itemCarbs = item.carbs * item.quantity;

              return Padding(
                padding: const EdgeInsets.only(bottom: 10.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 3),
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.accentPurple,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  item.foodName,
                                  style: GoogleFonts.montserrat(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                '${itemKcal.toStringAsFixed(0)} kcal',
                                style: GoogleFonts.montserrat(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Porción: ${item.quantity} x ${item.portionUnit}  •  ${item.category}',
                            style: GoogleFonts.montserrat(
                              fontSize: 12,
                              color: AppTheme.textSecondaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'P: ${itemProt.toStringAsFixed(1)}g  |  G: ${itemFat.toStringAsFixed(1)}g  |  C: ${itemCarbs.toStringAsFixed(1)}g',
                            style: GoogleFonts.montserrat(
                              fontSize: 11,
                              color: AppTheme.primaryPurple,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (item.notes != null && item.notes!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Nota: ${item.notes}',
                              style: GoogleFonts.montserrat(
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                                color: Colors.grey[700],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
