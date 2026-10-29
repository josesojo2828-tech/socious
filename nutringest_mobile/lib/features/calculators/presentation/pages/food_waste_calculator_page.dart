import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../providers/calculators_provider.dart';

class FoodWasteCalculatorPage extends StatefulWidget {
  final bool hideAppBar;

  const FoodWasteCalculatorPage({
    super.key,
    this.hideAppBar = false,
  });

  @override
  State<FoodWasteCalculatorPage> createState() => _FoodWasteCalculatorPageState();
}

class _FoodWasteCalculatorPageState extends State<FoodWasteCalculatorPage> {
  late TextEditingController _grossWeightController;
  late TextEditingController _netWeightController;
  late TextEditingController _wastePctController;

  @override
  void initState() {
    super.initState();
    final provider = context.read<CalculatorsProvider>();
    _grossWeightController = TextEditingController(text: provider.grossWeightInput.toStringAsFixed(0));
    _netWeightController = TextEditingController(text: provider.netWeightInput.toStringAsFixed(0));
    _wastePctController = TextEditingController(text: provider.customWastePercentage.toStringAsFixed(1));
  }

  @override
  void dispose() {
    _grossWeightController.dispose();
    _netWeightController.dispose();
    _wastePctController.dispose();
    super.dispose();
  }

  void _syncControllers(CalculatorsProvider provider) {
    final gStr = provider.grossWeightInput.toStringAsFixed(0);
    if (_grossWeightController.text != gStr) {
      _grossWeightController.text = gStr;
    }
    final nStr = provider.netWeightInput.toStringAsFixed(0);
    if (_netWeightController.text != nStr) {
      _netWeightController.text = nStr;
    }
    final wStr = provider.customWastePercentage.toStringAsFixed(1);
    if (_wastePctController.text != wStr) {
      _wastePctController.text = wStr;
    }
  }

  IconData _getIconForFood(String iconName) {
    switch (iconName) {
      case 'apple':
        return Icons.eco;
      case 'potato':
        return Icons.blur_circular;
      case 'poultry':
        return Icons.set_meal;
      case 'fish':
        return Icons.phishing;
      case 'spinach':
        return Icons.grass;
      case 'carrot':
        return Icons.spa;
      case 'banana':
        return Icons.lunch_dining;
      case 'broccoli':
        return Icons.forest;
      case 'orange':
        return Icons.brightness_5;
      case 'tomato':
        return Icons.circle;
      case 'pineapple':
        return Icons.star;
      case 'meat':
        return Icons.restaurant;
      default:
        return Icons.fastfood;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<CalculatorsProvider>();
    final result = provider.wasteResult;
    final isDark = theme.brightness == Brightness.dark;

    final isDirect = provider.wasteMode == WasteCalculationMode.direct;

    final bodyWidget = Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Mode Selector Tabs / Segmented Control
                  Text(
                    'Modo de Cálculo',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.cardDark : AppTheme.borderLight,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              provider.setWasteMode(WasteCalculationMode.direct);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isDirect ? AppTheme.primaryPurple : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  'Directo (PB ➔ PN)',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isDirect ? Colors.white : theme.textTheme.bodyMedium?.color,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              provider.setWasteMode(WasteCalculationMode.inverse);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: !isDirect ? AppTheme.primaryPurple : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  'Inverso (PN ➔ PB)',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: !isDirect ? Colors.white : theme.textTheme.bodyMedium?.color,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  Text(
                    isDirect
                        ? 'Ingresá el Peso Bruto (comprado) para calcular el Peso Neto comestible resultante.'
                        : 'Ingresá el Peso Neto (deseado en receta) para calcular cuánto Peso Bruto debés comprar.',
                    style: GoogleFonts.montserrat(fontSize: 12, color: theme.textTheme.bodyMedium?.color),
                  ),

                  const SizedBox(height: 20),

                  // Quick Catalog of Pre-configured Foods
                  Text(
                    'Catálogo de Merma Habitual',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  SizedBox(
                    height: 44,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: provider.foodCatalog.length + 1,
                      separatorBuilder: (context, index) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          final isSelected = provider.selectedFood == null;
                          return ChoiceChip(
                            label: Text(
                              'Personalizado',
                              style: GoogleFonts.montserrat(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                                color: isSelected ? Colors.white : null,
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppTheme.primaryPurple,
                            onSelected: (_) {
                              provider.selectFood(null);
                            },
                          );
                        }

                        final food = provider.foodCatalog[index - 1];
                        final isSelected = provider.selectedFood?.id == food.id;

                        return ChoiceChip(
                          avatar: Icon(
                            _getIconForFood(food.iconName),
                            size: 16,
                            color: isSelected ? Colors.white : AppTheme.primaryPurple,
                          ),
                          label: Text(
                            '${food.name} (${food.averageWastePercentage.round()}%)',
                            style: GoogleFonts.montserrat(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                              color: isSelected ? Colors.white : null,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppTheme.primaryPurple,
                          onSelected: (_) {
                            provider.selectFood(food);
                            _syncControllers(provider);
                          },
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Inputs Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (isDirect) ...[
                            // Gross Weight Input (PB)
                            _buildInputSliderField(
                              label: 'Peso Bruto a Comprar (PB - gramos)',
                              value: provider.grossWeightInput,
                              min: 100,
                              max: 10000,
                              controller: _grossWeightController,
                              onChanged: (val) {
                                provider.setGrossWeightInput(val);
                                _grossWeightController.text = val.toStringAsFixed(0);
                              },
                              onSubmitted: (val) {
                                final parsed = double.tryParse(val);
                                if (parsed != null && parsed > 0) {
                                  provider.setGrossWeightInput(parsed);
                                }
                              },
                            ),
                          ] else ...[
                            // Net Weight Input (PN)
                            _buildInputSliderField(
                              label: 'Peso Neto Deseado en Receta (PN - gramos)',
                              value: provider.netWeightInput,
                              min: 50,
                              max: 10000,
                              controller: _netWeightController,
                              onChanged: (val) {
                                provider.setNetWeightInput(val);
                                _netWeightController.text = val.toStringAsFixed(0);
                              },
                              onSubmitted: (val) {
                                final parsed = double.tryParse(val);
                                if (parsed != null && parsed > 0) {
                                  provider.setNetWeightInput(parsed);
                                }
                              },
                            ),
                          ],

                          const Divider(height: 24),

                          // Custom Waste Percentage Slider
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '% Merma Habitual (%M)',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                              ),
                              SizedBox(
                                width: 80,
                                height: 40,
                                child: TextField(
                                  controller: _wastePctController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 14),
                                  decoration: const InputDecoration(
                                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                  ),
                                  onSubmitted: (val) {
                                    final parsed = double.tryParse(val);
                                    if (parsed != null && parsed >= 0 && parsed <= 90) {
                                      provider.setCustomWastePercentage(parsed);
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                          Slider(
                            value: provider.customWastePercentage.clamp(0.0, 90.0),
                            min: 0.0,
                            max: 90.0,
                            divisions: 90,
                            activeColor: AppTheme.primaryPurple,
                            onChanged: (val) {
                              provider.setCustomWastePercentage(val);
                              _wastePctController.text = val.toStringAsFixed(1);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Sticky Bottom Results Card (Kombai var_9a62b3b95dc5)
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.cardDark : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Primary Result Highlight
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDirect
                                ? AppTheme.primaryPurple.withValues(alpha: 0.1)
                                : AppTheme.accentPurple.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDirect ? AppTheme.primaryPurple : AppTheme.accentPurple,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isDirect ? 'PESO BRUTO (PB)' : 'PESO BRUTO A COMPRAR (PB)',
                                style: GoogleFonts.montserrat(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDirect ? AppTheme.primaryPurple : AppTheme.accentPurple,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${result.grossWeight.round()} g',
                                style: GoogleFonts.montserrat(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: isDirect ? AppTheme.primaryPurple : AppTheme.accentPurple,
                                ),
                              ),
                              Text(
                                '${(result.grossWeight / 1000.0).toStringAsFixed(2)} kg',
                                style: GoogleFonts.montserrat(fontSize: 11, color: theme.textTheme.bodyMedium?.color),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.successGreen.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.successGreen),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PESO NETO (PN)',
                                style: GoogleFonts.montserrat(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.successGreen,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${result.netWeight.round()} g',
                                style: GoogleFonts.montserrat(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.successGreen,
                                ),
                              ),
                              Text(
                                '${(result.netWeight / 1000.0).toStringAsFixed(2)} kg',
                                style: GoogleFonts.montserrat(fontSize: 11, color: theme.textTheme.bodyMedium?.color),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Detail Metrics Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetricTile(
                        label: 'Merma Total',
                        value: '${result.wasteGrams.round()} g',
                        subtitle: '${(result.wasteGrams / 1000.0).toStringAsFixed(2)} kg',
                        icon: Icons.delete_outline,
                      ),
                      Container(height: 30, width: 1, color: AppTheme.borderLight),
                      _buildMetricTile(
                        label: '% Merma',
                        value: '${result.wastePercentage.toStringAsFixed(1)}%',
                        subtitle: 'Pérdida habitual',
                        icon: Icons.pie_chart_outline,
                      ),
                      Container(height: 30, width: 1, color: AppTheme.borderLight),
                      _buildMetricTile(
                        label: 'Factor Rendimiento (Fr)',
                        value: result.performanceFactor.toStringAsFixed(2),
                        subtitle: 'PB / PN',
                        icon: Icons.calculate_outlined,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      );

    if (widget.hideAppBar) {
      return bodyWidget;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Merma & Rendimiento de Alimentos',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Restablecer',
            onPressed: () {
              provider.resetWasteParams();
              _syncControllers(provider);
            },
          ),
        ],
      ),
      body: bodyWidget,
    );
  }

  Widget _buildInputSliderField({
    required String label,
    required double value,
    required double min,
    required double max,
    required TextEditingController controller,
    required ValueChanged<double> onChanged,
    required ValueChanged<String> onSubmitted,
  }) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
            SizedBox(
              width: 90,
              height: 40,
              child: TextField(
                controller: controller,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textAlign: TextAlign.center,
                style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 14),
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                ),
                onSubmitted: onSubmitted,
              ),
            ),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          activeColor: AppTheme.primaryPurple,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String subtitle,
    required IconData icon,
  }) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: AppTheme.primaryPurple),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.montserrat(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        Text(
          subtitle,
          style: GoogleFonts.montserrat(fontSize: 10, color: Colors.grey.shade600),
        ),
      ],
    );
  }
}
