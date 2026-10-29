import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../patients/models/patient_model.dart';
import '../../models/anamnesis_model.dart';
import '../../providers/clinical_provider.dart';

/// Kombai Screen 12 (var_059115dd5253): Ficha Clínica, Anamnesis y Recordatorio 24 Horas
class AnamnesisFormPage extends StatefulWidget {
  final PatientModel patient;

  const AnamnesisFormPage({super.key, required this.patient});

  @override
  State<AnamnesisFormPage> createState() => _AnamnesisFormPageState();
}

class _AnamnesisFormPageState extends State<AnamnesisFormPage> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _pathologiesCtrl;
  late TextEditingController _familyHistoryCtrl;
  late TextEditingController _medicationsCtrl;
  late TextEditingController _allergiesCtrl;
  late TextEditingController _sportsCtrl;
  late TextEditingController _waterCtrl;
  late TextEditingController _sleepCtrl;

  // Recordatorio 24h
  late TextEditingController _breakfastCtrl;
  late TextEditingController _morningSnackCtrl;
  late TextEditingController _lunchCtrl;
  late TextEditingController _afternoonSnackCtrl;
  late TextEditingController _dinnerCtrl;
  late TextEditingController _r24hNotesCtrl;

  String _physicalActivityLevel = 'Moderado';
  final List<String> _selectedSymptoms = [];

  final List<String> _symptomOptions = [
    'Acidez / Reflujo',
    'Distensión Abdominal',
    'Estreñimiento',
    'Gases / Flatulencias',
    'Gastritis',
    'Digestión Lenta',
    'Náuseas',
  ];

  @override
  void initState() {
    super.initState();

    _pathologiesCtrl = TextEditingController();
    _familyHistoryCtrl = TextEditingController();
    _medicationsCtrl = TextEditingController();
    _allergiesCtrl = TextEditingController();
    _sportsCtrl = TextEditingController();
    _waterCtrl = TextEditingController(text: '2.0');
    _sleepCtrl = TextEditingController(text: '7.5');

    _breakfastCtrl = TextEditingController();
    _morningSnackCtrl = TextEditingController();
    _lunchCtrl = TextEditingController();
    _afternoonSnackCtrl = TextEditingController();
    _dinnerCtrl = TextEditingController();
    _r24hNotesCtrl = TextEditingController();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<ClinicalProvider>();
      await provider.fetchAnamnesis(widget.patient.id);

      final current = provider.anamnesis;
      if (current != null && mounted) {
        setState(() {
          _pathologiesCtrl.text = current.pathologies;
          _familyHistoryCtrl.text = current.familyHistoryStr;
          _medicationsCtrl.text = current.medications;
          _allergiesCtrl.text = current.allergiesAndIntolerances;
          _sportsCtrl.text = current.sportsPracticed;
          _waterCtrl.text = current.dailyWaterLiters.toString();
          _sleepCtrl.text = current.sleepHours.toString();
          _physicalActivityLevel = current.physicalActivityLevel;

          _selectedSymptoms.clear();
          _selectedSymptoms.addAll(current.digestiveSymptoms);

          final r24 = current.r24hRecall;
          _breakfastCtrl.text = r24.breakfast;
          _morningSnackCtrl.text = r24.morningSnack;
          _lunchCtrl.text = r24.lunch;
          _afternoonSnackCtrl.text = r24.afternoonSnack;
          _dinnerCtrl.text = r24.dinner;
          _r24hNotesCtrl.text = r24.notes;
        });
      }
    });
  }

  @override
  void dispose() {
    _pathologiesCtrl.dispose();
    _familyHistoryCtrl.dispose();
    _medicationsCtrl.dispose();
    _allergiesCtrl.dispose();
    _sportsCtrl.dispose();
    _waterCtrl.dispose();
    _sleepCtrl.dispose();
    _breakfastCtrl.dispose();
    _morningSnackCtrl.dispose();
    _lunchCtrl.dispose();
    _afternoonSnackCtrl.dispose();
    _dinnerCtrl.dispose();
    _r24hNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveAnamnesis() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<ClinicalProvider>();

    final water = double.tryParse(_waterCtrl.text.replaceAll(',', '.')) ?? 2.0;
    final sleep = double.tryParse(_sleepCtrl.text.replaceAll(',', '.')) ?? 7.5;

    final model = AnamnesisModel(
      id: provider.anamnesis?.id ?? 'anam-${widget.patient.id}',
      patientId: widget.patient.id,
      updatedAt: DateTime.now(),
      pathologies: _pathologiesCtrl.text.trim(),
      familyHistory: _familyHistoryCtrl.text.trim(),
      medications: _medicationsCtrl.text.trim(),
      digestiveSymptoms: List<String>.from(_selectedSymptoms),
      allergiesAndIntolerances: _allergiesCtrl.text.trim(),
      physicalActivityLevel: _physicalActivityLevel,
      sportsPracticed: _sportsCtrl.text.trim(),
      dailyWaterLiters: water,
      sleepHours: sleep,
      r24hRecall: R24hRecallModel(
        breakfast: _breakfastCtrl.text.trim(),
        morningSnack: _morningSnackCtrl.text.trim(),
        lunch: _lunchCtrl.text.trim(),
        afternoonSnack: _afternoonSnackCtrl.text.trim(),
        dinner: _dinnerCtrl.text.trim(),
        notes: _r24hNotesCtrl.text.trim(),
      ),
    );

    final success = await provider.saveAnamnesis(model);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ficha Clínica y Anamnesis guardadas exitosamente'),
            backgroundColor: AppTheme.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Error al guardar la anamnesis'),
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
          'Ficha Clínica & Anamnesis',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Paciente Header
                    Text(
                      'ANTECEDENTES Y R24H: ${widget.patient.fullName.toUpperCase()}',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Section 1: Antecedentes Médicos
                    _buildSectionTitle('1. ANTECEDENTES MÉDICOS Y CLÍNICOS', Icons.local_hospital_outlined),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _pathologiesCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Patologías / Enfermedades Diagnosticadas',
                                hintText: 'Ej: Gastritis, Diabetes Tipo 2, Hipotiroidismo',
                                prefixIcon: Icon(Icons.healing_rounded, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _familyHistoryCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Antecedentes Familiares',
                                hintText: 'Ej: Madre con Hipertensión, Padre con Obesidad',
                                prefixIcon: Icon(Icons.family_restroom_rounded, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _medicationsCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Medicamentos y Suplementos Habituales',
                                hintText: 'Ej: Levotiroxina 50mcg, Omega 3, Proteína Whey',
                                prefixIcon: Icon(Icons.medication_outlined, size: 20),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 2: Síntomas Digestivos
                    _buildSectionTitle('2. SÍNTOMAS DIGESTIVOS HABITUALES', Icons.medical_information_outlined),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Seleccione los síntomas digestivos presentes:',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.textSecondaryLight,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: _symptomOptions.map((symptom) {
                                final isSelected = _selectedSymptoms.contains(symptom);
                                return FilterChip(
                                  label: Text(symptom),
                                  selected: isSelected,
                                  selectedColor: AppTheme.softPurpleChip,
                                  checkmarkColor: AppTheme.primaryPurple,
                                  labelStyle: GoogleFonts.montserrat(
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    color: isSelected ? AppTheme.primaryPurple : theme.colorScheme.onSurface,
                                  ),
                                  onSelected: (selected) {
                                    setState(() {
                                      if (selected) {
                                        _selectedSymptoms.add(symptom);
                                      } else {
                                        _selectedSymptoms.remove(symptom);
                                      }
                                    });
                                  },
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 3: Alergias e Intolerancias
                    _buildSectionTitle('3. ALERGIAS E INTOLERANCIAS', Icons.no_food_outlined),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: TextFormField(
                          controller: _allergiesCtrl,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            labelText: 'Alergias / Intolerancias Alimentarias',
                            hintText: 'Ej: Intolerante a la lactosa, celíaco (gluten), alergia a frutos secos',
                            prefixIcon: Icon(Icons.warning_amber_rounded, size: 20),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 4: Estilo de Vida y Deporte
                    _buildSectionTitle('4. ESTILO DE VIDA Y HÁBITOS', Icons.fitness_center_rounded),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            DropdownButtonFormField<String>(
                              initialValue: _physicalActivityLevel,
                              decoration: const InputDecoration(
                                labelText: 'Nivel de Actividad Física',
                                prefixIcon: Icon(Icons.directions_run_rounded, size: 20),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'Sedentario', child: Text('Sedentario (Poco o nada de ejercicio)')),
                                DropdownMenuItem(value: 'Moderado', child: Text('Moderado (1-3 días/sem)')),
                                DropdownMenuItem(value: 'Activo', child: Text('Activo (3-5 días/sem)')),
                                DropdownMenuItem(value: 'Muy Activo', child: Text('Muy Activo (6-7 días/sem atleta)')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _physicalActivityLevel = val);
                              },
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _sportsCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Deporte o Entrenamiento Practicado',
                                hintText: 'Ej: Gimnasio, Crossfit, Ciclismo, Natación',
                                prefixIcon: Icon(Icons.sports_soccer_rounded, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _waterCtrl,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    decoration: const InputDecoration(
                                      labelText: 'Agua Diaria (Liters)',
                                      prefixIcon: Icon(Icons.water_drop_outlined, size: 18),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextFormField(
                                    controller: _sleepCtrl,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    decoration: const InputDecoration(
                                      labelText: 'Sueño (Horas/noche)',
                                      prefixIcon: Icon(Icons.bedtime_outlined, size: 18),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 5: Recordatorio de 24 Horas (R24H)
                    _buildSectionTitle('5. RECORDATORIO DE 24 HORAS (R24H)', Icons.restaurant_menu_rounded),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14.0),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _breakfastCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Desayuno',
                                hintText: 'Alimentos y bebidas consumidos por la mañana',
                                prefixIcon: Icon(Icons.free_breakfast_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _morningSnackCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Media Mañana (Snack)',
                                hintText: 'Fruta, frutos secos, yogurt, etc.',
                                prefixIcon: Icon(Icons.apple_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _lunchCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Almuerzo Principal',
                                hintText: 'Plato fuerte, ensaladas, carbohidratos',
                                prefixIcon: Icon(Icons.lunch_dining_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _afternoonSnackCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Media Tarde (Merienda)',
                                hintText: 'Infusiones, tostadas, batidos',
                                prefixIcon: Icon(Icons.bakery_dining_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _dinnerCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Cena',
                                hintText: 'Proteínas, vegetales, colación nocturna',
                                prefixIcon: Icon(Icons.dinner_dining_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _r24hNotesCtrl,
                              maxLines: 2,
                              decoration: const InputDecoration(
                                labelText: 'Notas Adicionales de Alimentación / Picoteo',
                                hintText: 'Consumo de golosinas, alcohol, picoteo fuera de hora',
                                prefixIcon: Icon(Icons.notes_rounded, size: 20),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isLoading ? null : _saveAnamnesis,
                      child: Text(
                        'GUARDAR FICHA CLÍNICA Y ANAMNESIS',
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
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
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
}
