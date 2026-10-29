import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/anthropometry_model.dart';
import '../../providers/clinical_provider.dart';
import '../../utils/isak_calculator.dart';
import 'somatocart_and_graphics_page.dart';

/// Kombai Screen 6 (var_f1481050687c): Formulario de Antropometría e ISAK
class AnthropometryFormPage extends StatefulWidget {
  final PatientModel patient;
  final AnthropometryModel? initialMeasurement;

  const AnthropometryFormPage({
    super.key,
    required this.patient,
    this.initialMeasurement,
  });

  @override
  State<AnthropometryFormPage> createState() => _AnthropometryFormPageState();
}

class _AnthropometryFormPageState extends State<AnthropometryFormPage> {
  final _formKey = GlobalKey<FormState>();

  // Datos básicos
  late TextEditingController _weightCtrl;
  late TextEditingController _heightCtrl;
  late TextEditingController _ageCtrl;
  late String _gender;

  // Pliegues cutáneos (mm)
  late TextEditingController _tricepsCtrl;
  late TextEditingController _subscapularCtrl;
  late TextEditingController _supraspinaleCtrl;
  late TextEditingController _abdominalCtrl;
  late TextEditingController _thighCtrl;
  late TextEditingController _calfCtrl;
  late TextEditingController _bicepsCtrl;
  late TextEditingController _iliacCrestCtrl;

  // Perímetros (cm)
  late TextEditingController _armRelaxedCtrl;
  late TextEditingController _armFlexedCtrl;
  late TextEditingController _waistCtrl;
  late TextEditingController _hipCtrl;
  late TextEditingController _thighGirthCtrl;
  late TextEditingController _calfGirthCtrl;

  // Diámetros (cm)
  late TextEditingController _wristCtrl;
  late TextEditingController _humerusCtrl;
  late TextEditingController _femurCtrl;

  late TextEditingController _notesCtrl;

  // Resultado en tiempo real
  IsakResult? _liveResult;

  @override
  void initState() {
    super.initState();
    final init = widget.initialMeasurement;

    final ageVal = widget.patient.age?.toDouble() ?? 30.0;
    final genderVal = widget.patient.gender ?? 'FEMALE';

    _weightCtrl = TextEditingController(text: init?.weight.toString() ?? '68.5');
    _heightCtrl = TextEditingController(text: init?.height.toString() ?? '168.0');
    _ageCtrl = TextEditingController(text: init?.age.toString() ?? ageVal.toString());
    _gender = init?.gender ?? genderVal;

    _tricepsCtrl = TextEditingController(text: init?.triceps.toString() ?? '14.0');
    _subscapularCtrl = TextEditingController(text: init?.subscapular.toString() ?? '15.5');
    _supraspinaleCtrl = TextEditingController(text: init?.supraspinale.toString() ?? '12.0');
    _abdominalCtrl = TextEditingController(text: init?.abdominal.toString() ?? '18.0');
    _thighCtrl = TextEditingController(text: init?.thigh.toString() ?? '21.0');
    _calfCtrl = TextEditingController(text: init?.calf.toString() ?? '12.5');
    _bicepsCtrl = TextEditingController(text: init?.biceps.toString() ?? '6.5');
    _iliacCrestCtrl = TextEditingController(text: init?.iliacCrest.toString() ?? '16.0');

    _armRelaxedCtrl = TextEditingController(text: init?.armRelaxed.toString() ?? '27.0');
    _armFlexedCtrl = TextEditingController(text: init?.armFlexed.toString() ?? '29.2');
    _waistCtrl = TextEditingController(text: init?.waist.toString() ?? '69.5');
    _hipCtrl = TextEditingController(text: init?.hip.toString() ?? '96.0');
    _thighGirthCtrl = TextEditingController(text: init?.thighGirth.toString() ?? '54.5');
    _calfGirthCtrl = TextEditingController(text: init?.calfGirth.toString() ?? '35.2');

    _wristCtrl = TextEditingController(text: init?.wrist.toString() ?? '5.2');
    _humerusCtrl = TextEditingController(text: init?.humerus.toString() ?? '6.2');
    _femurCtrl = TextEditingController(text: init?.femur.toString() ?? '8.8');

    _notesCtrl = TextEditingController(text: init?.notes ?? '');

    _recalculateLiveIsak();
  }

  @override
  void dispose() {
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _ageCtrl.dispose();
    _tricepsCtrl.dispose();
    _subscapularCtrl.dispose();
    _supraspinaleCtrl.dispose();
    _abdominalCtrl.dispose();
    _thighCtrl.dispose();
    _calfCtrl.dispose();
    _bicepsCtrl.dispose();
    _iliacCrestCtrl.dispose();
    _armRelaxedCtrl.dispose();
    _armFlexedCtrl.dispose();
    _waistCtrl.dispose();
    _hipCtrl.dispose();
    _thighGirthCtrl.dispose();
    _calfGirthCtrl.dispose();
    _wristCtrl.dispose();
    _humerusCtrl.dispose();
    _femurCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  double _parse(TextEditingController ctrl) {
    return double.tryParse(ctrl.text.replaceAll(',', '.')) ?? 0.0;
  }

  void _recalculateLiveIsak() {
    final weight = _parse(_weightCtrl);
    final height = _parse(_heightCtrl);
    final age = _parse(_ageCtrl);
    final isMale = _gender.toUpperCase() == 'MALE' || _gender.toUpperCase() == 'M';

    if (weight > 0 && height > 0) {
      setState(() {
        _liveResult = IsakCalculator.computeFullIsak(
          weightKg: weight,
          heightCm: height,
          age: age,
          isMale: isMale,
          tricepsMm: _parse(_tricepsCtrl),
          subscapularMm: _parse(_subscapularCtrl),
          supraspinaleMm: _parse(_supraspinaleCtrl),
          abdominalMm: _parse(_abdominalCtrl),
          thighMm: _parse(_thighCtrl),
          calfMm: _parse(_calfCtrl),
          armRelaxedGirthCm: _parse(_armRelaxedCtrl),
          armFlexedGirthCm: _parse(_armFlexedCtrl),
          waistGirthCm: _parse(_waistCtrl),
          hipGirthCm: _parse(_hipCtrl),
          thighGirthCm: _parse(_thighGirthCtrl),
          calfGirthCm: _parse(_calfGirthCtrl),
          humerusDiameterCm: _parse(_humerusCtrl),
          femurDiameterCm: _parse(_femurCtrl),
          wristDiameterCm: _parse(_wristCtrl),
        );
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<ClinicalProvider>();
    final newId = widget.initialMeasurement?.id ?? 'anth-${DateTime.now().millisecondsSinceEpoch}';

    final model = AnthropometryModel(
      id: newId,
      patientId: widget.patient.id,
      date: widget.initialMeasurement?.date ?? DateTime.now(),
      weight: _parse(_weightCtrl),
      height: _parse(_heightCtrl),
      age: _parse(_ageCtrl),
      gender: _gender,
      triceps: _parse(_tricepsCtrl),
      subscapular: _parse(_subscapularCtrl),
      supraspinale: _parse(_supraspinaleCtrl),
      abdominal: _parse(_abdominalCtrl),
      thigh: _parse(_thighCtrl),
      calf: _parse(_calfCtrl),
      biceps: _parse(_bicepsCtrl),
      iliacCrest: _parse(_iliacCrestCtrl),
      armRelaxed: _parse(_armRelaxedCtrl),
      armFlexed: _parse(_armFlexedCtrl),
      waist: _parse(_waistCtrl),
      hip: _parse(_hipCtrl),
      thighGirth: _parse(_thighGirthCtrl),
      calfGirth: _parse(_calfGirthCtrl),
      wrist: _parse(_wristCtrl),
      humerus: _parse(_humerusCtrl),
      femur: _parse(_femurCtrl),
      notes: _notesCtrl.text.trim(),
    );

    final success = await provider.saveAnthropometry(model);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Medición Antropométrica ISAK guardada exitosamente!'),
            backgroundColor: AppTheme.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );

        // Opción para abrir Somatocarta directamente
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => SomatocartAndGraphicsPage(patient: widget.patient),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Error al guardar la medición'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLoading = context.watch<ClinicalProvider>().isLoading;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Nueva Medición ISAK',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.line_axis_rounded, color: AppTheme.primaryPurple),
            tooltip: 'Ver Somatocarta',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SomatocartAndGraphicsPage(patient: widget.patient),
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Card de Cálculo en Tiempo Real Sticky Top
              if (_liveResult != null) _buildLiveMetricsCard(theme),

              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Paciente Encabezado
                    Text(
                      'PACIENTE: ${widget.patient.fullName.toUpperCase()}',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Section 1: Datos Básicos
                    _buildSectionHeader('1. DATOS BÁSICOS Y ANTROPOMÉTRICOS', Icons.person_outline),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _buildNumberInput(
                                    controller: _weightCtrl,
                                    label: 'Peso (kg)',
                                    icon: Icons.monitor_weight_outlined,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _buildNumberInput(
                                    controller: _heightCtrl,
                                    label: 'Talla (cm)',
                                    icon: Icons.height,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildNumberInput(
                                    controller: _ageCtrl,
                                    label: 'Edad (años)',
                                    icon: Icons.cake_outlined,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _gender,
                                    decoration: const InputDecoration(
                                      labelText: 'Género',
                                      prefixIcon: Icon(Icons.wc_rounded, size: 18),
                                    ),
                                    items: const [
                                      DropdownMenuItem(value: 'FEMALE', child: Text('Femenino')),
                                      DropdownMenuItem(value: 'MALE', child: Text('Masculino')),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) {
                                        setState(() => _gender = val);
                                        _recalculateLiveIsak();
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 2: Pliegues Cutáneos (mm)
                    _buildSectionHeader('2. PLIEGUES CUTÁNEOS (mm)', Icons.straighten_rounded),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _tricepsCtrl, label: 'Tríceps (mm)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _subscapularCtrl, label: 'Subescapular (mm)')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _supraspinaleCtrl, label: 'Supraespinal (mm)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _abdominalCtrl, label: 'Abdominal (mm)')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _thighCtrl, label: 'Muslo Ant. (mm)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _calfCtrl, label: 'Pantorrilla (mm)')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _bicepsCtrl, label: 'Bíceps (opc, mm)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _iliacCrestCtrl, label: 'Cresta Ilíaca (opc)')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 3: Perímetros Corporales (cm)
                    _buildSectionHeader('3. PERÍMETROS CORPORALES (cm)', Icons.square_foot_rounded),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _armRelaxedCtrl, label: 'Brazo Relajado')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _armFlexedCtrl, label: 'Brazo Flexionado')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _waistCtrl, label: 'Cintura (cm)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _hipCtrl, label: 'Cadera (cm)')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _thighGirthCtrl, label: 'Muslo Medio')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _calfGirthCtrl, label: 'Pantorrilla (cm)')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 4: Diámetros Óseos (cm)
                    _buildSectionHeader('4. DIÁMETROS ÓSEOS (cm)', Icons.architecture_rounded),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: _buildNumberInput(controller: _wristCtrl, label: 'Biestiloideo (Muñeca)')),
                                const SizedBox(width: 10),
                                Expanded(child: _buildNumberInput(controller: _humerusCtrl, label: 'Humeral (Húmero)')),
                              ],
                            ),
                            const SizedBox(height: 10),
                            _buildNumberInput(controller: _femurCtrl, label: 'Femoral (Fémur cm)'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Notas y observaciones
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Notas y Observaciones Clínicas',
                        hintText: 'Ingrese observaciones de la toma de datos...',
                        alignLabelWithHint: true,
                        prefixIcon: Icon(Icons.note_alt_outlined),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Botón Guardar
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isLoading ? null : _submitForm,
                      child: isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text(
                              'GUARDAR MEDICIÓN Y VER SOMATOCARTA',
                              style: GoogleFonts.montserrat(
                                fontSize: 13.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLiveMetricsCard(ThemeData theme) {
    final r = _liveResult!;
    return Container(
      width: double.infinity,
      color: AppTheme.primaryPurple.withValues(alpha: 0.06),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.bolt_rounded, color: AppTheme.primaryPurple, size: 20),
                  const SizedBox(width: 6),
                  Text(
                    'CÁLCULO ISAK EN TIEMPO REAL',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: AppTheme.primaryPurple,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryPurple,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  r.somatotypeCategory,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildLiveChip('∑ 6 Pliegues', '${r.sum6.toStringAsFixed(1)} mm'),
              _buildLiveChip('% Grasa', '${r.fatPercentage}% (${r.fatKg} kg)'),
              _buildLiveChip('% Músculo', '${r.musclePercentage}% (${r.muscleKg} kg)'),
              _buildLiveChip('Somatocarta', 'X: ${r.x}, Y: ${r.y}'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLiveChip(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.montserrat(
            fontSize: 10,
            color: AppTheme.textSecondaryLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryPurple),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.6,
            color: AppTheme.textSecondaryLight,
          ),
        ),
      ],
    );
  }

  Widget _buildNumberInput({
    required TextEditingController controller,
    required String label,
    IconData? icon,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: icon != null ? Icon(icon, size: 18) : null,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      onChanged: (_) => _recalculateLiveIsak(),
      validator: (val) {
        if (val == null || val.trim().isEmpty) return 'Requerido';
        if (double.tryParse(val.replaceAll(',', '.')) == null) return 'Inválido';
        return null;
      },
    );
  }
}
