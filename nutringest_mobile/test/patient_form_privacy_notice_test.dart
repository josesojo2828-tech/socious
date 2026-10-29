import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nutringest_mobile/features/patients/models/patient_model.dart';
import 'package:nutringest_mobile/features/patients/presentation/pages/patient_form_page.dart';
import 'package:nutringest_mobile/features/patients/providers/patients_provider.dart';
import 'package:nutringest_mobile/features/patients/services/patient_service.dart';

/// Servicio falso: registra lo que la app envía al backend sin tocar la red.
class _RecordingPatientService extends PatientService {
  final List<Map<String, dynamic>> createdPayloads = [];
  final List<Map<String, dynamic>> updatedPayloads = [];

  @override
  Future<List<PatientModel>> getPatients({
    String? query,
    String? status,
    int limit = 100,
  }) async {
    return [];
  }

  @override
  Future<PatientModel> createPatient(Map<String, dynamic> data) async {
    createdPayloads.add(Map<String, dynamic>.from(data));
    return PatientModel(
      id: 'patient-1',
      firstName: '${data['firstName']}',
      lastName: '${data['lastName']}',
    );
  }

  @override
  Future<PatientModel> updatePatient(String id, Map<String, dynamic> data) async {
    updatedPayloads.add(Map<String, dynamic>.from(data));
    return PatientModel(
      id: id,
      firstName: '${data['firstName']}',
      lastName: '${data['lastName']}',
    );
  }
}

Future<void> _openPatientForm(
  WidgetTester tester,
  PatientsProvider provider, {
  PatientModel? patient,
}) async {
  // Ancho amplio: el dropdown de "Estado de la Ficha" (preexistente) desborda
  // en pantallas angostas y ensucia el test con errores de layout ajenos al caso.
  tester.view.physicalSize = const Size(700, 2000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);

  await tester.pumpWidget(
    ChangeNotifierProvider<PatientsProvider>.value(
      value: provider,
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PatientFormPage(patient: patient),
                ),
              ),
              child: const Text('abrir'),
            ),
          ),
        ),
      ),
    ),
  );

  await tester.tap(find.text('abrir'));
  await tester.pumpAndSettle();
}

Future<void> _fillRequiredNames(WidgetTester tester) async {
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ej. Sofía'),
    'Sofía',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ej. Rodríguez'),
    'Rodríguez',
  );
  await tester.pumpAndSettle();
}

void main() {
  group('PatientFormPage — Aviso de Privacidad (S5 legal-compliance)', () {
    late _RecordingPatientService service;
    late PatientsProvider provider;

    setUp(() {
      service = _RecordingPatientService();
      provider = PatientsProvider(patientService: service);
    });

    testWidgets('muestra el control de aceptación al registrar un paciente nuevo',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);

      expect(find.byType(Checkbox), findsOneWidget);
      expect(find.textContaining('Aviso de Privacidad'), findsWidgets);
      expect(find.text('Confirmo que el paciente recibió y aceptó el Aviso de Privacidad (versión vigente) antes de registrar sus datos clínicos.'),
          findsOneWidget);
    });

    testWidgets(
        'bloquea el registro y no envía nada si el profesional no acepta el Aviso de Privacidad',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Debe confirmarse'), findsOneWidget);
      expect(service.createdPayloads, isEmpty);
    });

    testWidgets(
        'envía privacyNoticeAccepted true cuando el profesional acepta el Aviso de Privacidad',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads.length, 1);
      expect(service.createdPayloads.first['privacyNoticeAccepted'], isTrue);
      expect(find.textContaining('Debe confirmarse'), findsNothing);
    });

    testWidgets(
        'no exige la aceptación al editar un paciente ya registrado',
        (WidgetTester tester) async {
      await _openPatientForm(
        tester,
        provider,
        patient: const PatientModel(
          id: 'patient-1',
          firstName: 'Sofía',
          lastName: 'Rodríguez',
        ),
      );

      expect(find.byType(Checkbox), findsNothing);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Guardar Cambios'));
      await tester.pumpAndSettle();

      expect(service.updatedPayloads.length, 1);
      expect(service.createdPayloads, isEmpty);
    });
  });
}
