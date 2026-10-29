import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../providers/calculators_provider.dart';
import '../../utils/energy_calculator.dart';

class TmbGetCalculatorPage extends StatefulWidget {
  final PatientModel? patient;
  final bool hideAppBar;

  const TmbGetCalculatorPage({
    super.key,
    this.patient,
    this.hideAppBar = false,
  });

  @override
  State<TmbGetCalculatorPage> createState() => _TmbGetCalculatorPageState();
}

class _TmbGetCalculatorPageState extends State<TmbGetCalculatorPage> {
  late TextEditingController _weightController;
  late TextEditingController _heightController;
  late TextEditingController _ageController;
  late TextEditingController _fatController;

  @override
  void initState() {
    super.initState();
    final provider = context.read<CalculatorsProvider>();

    if (widget.patient != null) {
      final p = widget.patient!;
      if (p.age != null && p.age! > 0) {
        provider.updateEnergyParams(age: p.age);
      }
      if (p.gender != null) {
        final isMale = p.gender!.toUpperCase() != 'FEMALE';
        provider.updateEnergyParams(isMale: isMale);
      }
    }

    _weightController = TextEditingController(text: provider.weight.toStringAsFixed(1));
    _heightController = TextEditingController(text: provider.height.toStringAsFixed(1));
    _ageController = TextEditingController(text: provider.age.toString());
    _fatController = TextEditingController(text: provider.bodyFatPercentage.toStringAsFixed(1));
  }

  @override
  void dispose() {
    _weightController.dispose();
    _heightController.dispose();
    _ageController.dispose();
    _fatController.dispose();
    super.dispose();
  }

  void _syncControllers(CalculatorsProvider provider) {
    final wStr = provider.weight.toStringAsFixed(1);
    if (_weightController.text != wStr) {
      _weightController.text = wStr;
    }
    final hStr = provider.height.toStringAsFixed(1);
    if (_heightController.text != hStr) {
      _heightController.text = hStr;
    }
    final aStr = provider.age.toString();
    if (_ageController.text != aStr) {
      _ageController.text = aStr;
    }
    final fStr = provider.bodyFatPercentage.toStringAsFixed(1);
    if (_fatController.text != fStr) {
      _fatController.text = fStr;
    }
  }

  String _getActivityLabel(double factor) {
    if (factor <= 1.20) return 'Sedentario (1.20)';
    if (factor <= 1.375) return 'Actividad Ligera (1.375)';
    if (factor <= 1.55) return 'Actividad Moderada (1.55)';
    if (factor <= 1.725) return 'Actividad Fuerte (1.725)';
    return 'Actividad Muy Fuerte (1.90)';
  }

  String _getStressLabel(double factor) {
    if (factor <= 1.05) return 'Sin Estrés / Normal (1.00)';
    if (factor <= 1.20) return 'Cirugía Menor / Ambulatorio (1.20)';
    if (factor <= 1.35) return 'Cirugía Mayor / Trauma (1.35)';
    if (factor <= 1.50) return 'Sepsis / Infección Grave (1.50)';
    return 'Quemaduras / Gran Trauma (2.00)';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<CalculatorsProvider>();
    final result = provider.energyResult;
    final isDark = theme.brightness == Brightness.dark;

    final bodyWidget = Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Patient Banner if attached
                  if (widget.patient != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryPurple.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person, color: AppTheme.primaryPurple),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Paciente: ${widget.patient!.fullName}',
                                  style: GoogleFonts.montserrat(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryPurple,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  'Datos pre-poblados de la ficha del paciente',
                                  style: GoogleFonts.montserrat(
                                    fontSize: 12,
                                    color: theme.textTheme.bodyMedium?.color,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Formula Selector Card
                  Text(
                    'Fórmula de Cálculo TMB',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: EnergyFormula.values.map((formula) {
                          final selected = provider.energyFormula == formula;
                          return InkWell(
                            onTap: () => provider.setEnergyFormula(formula),
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                              child: Row(
                                children: [
                                  Icon(
                                    selected ? Icons.radio_button_checked : Icons.radio_button_off,
                                    color: selected ? AppTheme.primaryPurple : Colors.grey,
                                    size: 22,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          formula.displayName,
                                          style: GoogleFonts.montserrat(
                                            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                                            color: selected ? AppTheme.primaryPurple : null,
                                            fontSize: 14,
                                          ),
                                        ),
                                        Text(
                                          formula.description,
                                          style: GoogleFonts.montserrat(fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Gender Selector
                  Text(
                    'Sexo Biológico',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Text(
                                '♂ Hombre',
                                style: GoogleFonts.montserrat(
                                  fontWeight: FontWeight.bold,
                                  color: provider.isMale ? Colors.white : theme.textTheme.bodyLarge?.color,
                                ),
                              ),
                            ),
                          ),
                          selected: provider.isMale,
                          selectedColor: AppTheme.primaryPurple,
                          onSelected: (selected) {
                            if (selected) provider.updateEnergyParams(isMale: true);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ChoiceChip(
                          label: Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Text(
                                '♀ Mujer',
                                style: GoogleFonts.montserrat(
                                  fontWeight: FontWeight.bold,
                                  color: !provider.isMale ? Colors.white : theme.textTheme.bodyLarge?.color,
                                ),
                              ),
                            ),
                          ),
                          selected: !provider.isMale,
                          selectedColor: AppTheme.accentPurple,
                          onSelected: (selected) {
                            if (selected) provider.updateEnergyParams(isMale: false);
                          },
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Anthropometric Sliders & Inputs
                  Text(
                    'Parámetros Antropométricos',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          // Weight
                          _buildNumberSliderRow(
                            label: 'Peso (kg)',
                            value: provider.weight,
                            min: 30.0,
                            max: 200.0,
                            controller: _weightController,
                            onChanged: (val) {
                              provider.updateEnergyParams(weight: val);
                              _weightController.text = val.toStringAsFixed(1);
                            },
                            onInputSubmitted: (val) {
                              final parsed = double.tryParse(val);
                              if (parsed != null && parsed >= 20 && parsed <= 300) {
                                provider.updateEnergyParams(weight: parsed);
                              }
                            },
                          ),

                          const Divider(height: 24),

                          // Height
                          _buildNumberSliderRow(
                            label: 'Talla (cm)',
                            value: provider.height,
                            min: 100.0,
                            max: 230.0,
                            controller: _heightController,
                            onChanged: (val) {
                              provider.updateEnergyParams(height: val);
                              _heightController.text = val.toStringAsFixed(1);
                            },
                            onInputSubmitted: (val) {
                              final parsed = double.tryParse(val);
                              if (parsed != null && parsed >= 50 && parsed <= 250) {
                                provider.updateEnergyParams(height: parsed);
                              }
                            },
                          ),

                          const Divider(height: 24),

                          // Age
                          _buildNumberSliderRow(
                            label: 'Edad (años)',
                            value: provider.age.toDouble(),
                            min: 10.0,
                            max: 100.0,
                            divisions: 90,
                            controller: _ageController,
                            onChanged: (val) {
                              provider.updateEnergyParams(age: val.round());
                              _ageController.text = val.round().toString();
                            },
                            onInputSubmitted: (val) {
                              final parsed = int.tryParse(val);
                              if (parsed != null && parsed >= 1 && parsed <= 120) {
                                provider.updateEnergyParams(age: parsed);
                              }
                            },
                          ),

                          // Body Fat (If Cunningham or Katch-McArdle)
                          if (provider.energyFormula == EnergyFormula.cunningham ||
                              provider.energyFormula == EnergyFormula.katchMcardle) ...[
                            const Divider(height: 24),
                            _buildNumberSliderRow(
                              label: '% Grasa Corporal',
                              value: provider.bodyFatPercentage,
                              min: 5.0,
                              max: 60.0,
                              controller: _fatController,
                              onChanged: (val) {
                                provider.updateEnergyParams(bodyFatPercentage: val);
                                _fatController.text = val.toStringAsFixed(1);
                              },
                              onInputSubmitted: (val) {
                                final parsed = double.tryParse(val);
                                if (parsed != null && parsed >= 2 && parsed <= 70) {
                                  provider.updateEnergyParams(bodyFatPercentage: parsed);
                                }
                              },
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Factors Card
                  Text(
                    'Factores de Actividad y Estrés',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Physical Activity Slider
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Actividad Física (FA)',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  provider.activityFactor.toStringAsFixed(3),
                                  style: GoogleFonts.montserrat(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryPurple,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getActivityLabel(provider.activityFactor),
                            style: GoogleFonts.montserrat(fontSize: 12, color: theme.textTheme.bodyMedium?.color),
                          ),
                          Slider(
                            value: provider.activityFactor,
                            min: 1.20,
                            max: 1.90,
                            divisions: 28,
                            activeColor: AppTheme.primaryPurple,
                            onChanged: (val) {
                              provider.updateEnergyParams(activityFactor: val);
                            },
                          ),

                          const Divider(height: 24),

                          // Stress Factor Slider
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Factor de Estrés (FE)',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentPurple.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  provider.stressFactor.toStringAsFixed(2),
                                  style: GoogleFonts.montserrat(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.accentPurple,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getStressLabel(provider.stressFactor),
                            style: GoogleFonts.montserrat(fontSize: 12, color: theme.textTheme.bodyMedium?.color),
                          ),
                          Slider(
                            value: provider.stressFactor,
                            min: 1.00,
                            max: 2.00,
                            divisions: 20,
                            activeColor: AppTheme.accentPurple,
                            onChanged: (val) {
                              provider.updateEnergyParams(stressFactor: val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Macro Distribution Adjustments
                  Text(
                    'Distribución de Macronutrientes',
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          // Protein Slider (g/kg)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Proteína (g/kg peso)',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                              ),
                              Chip(
                                label: Text(
                                  '${provider.proteinGPerKg.toStringAsFixed(2)} g/kg',
                                  style: GoogleFonts.montserrat(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                                backgroundColor: AppTheme.primaryPurple,
                              ),
                            ],
                          ),
                          Slider(
                            value: provider.proteinGPerKg,
                            min: 0.8,
                            max: 3.5,
                            divisions: 27,
                            activeColor: AppTheme.primaryPurple,
                            onChanged: (val) {
                              provider.updateEnergyParams(proteinGPerKg: val);
                            },
                          ),

                          const Divider(height: 20),

                          // Fat Slider (%)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Grasas (% GET)',
                                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                              ),
                              Chip(
                                label: Text(
                                  '${provider.fatPercentage.toStringAsFixed(0)}%',
                                  style: GoogleFonts.montserrat(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                                backgroundColor: Colors.amber.shade800,
                              ),
                            ],
                          ),
                          Slider(
                            value: provider.fatPercentage,
                            min: 15.0,
                            max: 50.0,
                            divisions: 35,
                            activeColor: Colors.amber.shade800,
                            onChanged: (val) {
                              provider.updateEnergyParams(fatPercentage: val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),

          // Sticky Bottom Results Card (Kombai var_142cac0e02d1)
          Container(
            padding: const EdgeInsets.all(16.0),
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
                  // Prominent TMB & GET Display
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryPurple.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.2)),
                          ),
                          child: Column(
                            children: [
                              Text(
                                'TMB (Basal)',
                                style: GoogleFonts.montserrat(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primaryPurple,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${result.tmb.round()} kcal',
                                style: GoogleFonts.montserrat(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryPurple,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.primaryPurple, AppTheme.accentPurple],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              Text(
                                'GET (Total)',
                                style: GoogleFonts.montserrat(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white70,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${result.get.round()} kcal',
                                style: GoogleFonts.montserrat(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Macros Summary Chips Row
                  Row(
                    children: [
                      _buildMacroBadge(
                        label: 'PROT',
                        kcal: result.protein.kcal.round(),
                        grams: result.protein.grams.round(),
                        percent: result.protein.percent.round(),
                        gPerKg: result.protein.gPerKg,
                        color: AppTheme.primaryPurple,
                      ),
                      const SizedBox(width: 8),
                      _buildMacroBadge(
                        label: 'GRASA',
                        kcal: result.fat.kcal.round(),
                        grams: result.fat.grams.round(),
                        percent: result.fat.percent.round(),
                        gPerKg: result.fat.gPerKg,
                        color: Colors.amber.shade800,
                      ),
                      const SizedBox(width: 8),
                      _buildMacroBadge(
                        label: 'CARB',
                        kcal: result.carbs.kcal.round(),
                        grams: result.carbs.grams.round(),
                        percent: result.carbs.percent.round(),
                        gPerKg: result.carbs.gPerKg,
                        color: Colors.teal,
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
          'Calculadora TMB & GET',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Restablecer Valores',
            onPressed: () {
              provider.resetEnergyParams();
              _syncControllers(provider);
            },
          ),
        ],
      ),
      body: bodyWidget,
    );
  }

  Widget _buildNumberSliderRow({
    required String label,
    required double value,
    required double min,
    required double max,
    int? divisions,
    required TextEditingController controller,
    required ValueChanged<double> onChanged,
    required ValueChanged<String> onInputSubmitted,
  }) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
            ),
            SizedBox(
              width: 85,
              height: 40,
              child: TextField(
                controller: controller,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textAlign: TextAlign.center,
                style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 14),
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                ),
                onSubmitted: onInputSubmitted,
              ),
            ),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: divisions,
          activeColor: AppTheme.primaryPurple,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildMacroBadge({
    required String label,
    required int kcal,
    required int grams,
    required int percent,
    required double gPerKg,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  '$percent%',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              '${grams}g ($kcal kcal)',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${gPerKg.toStringAsFixed(1)} g/kg',
              style: GoogleFonts.montserrat(
                fontSize: 10,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
