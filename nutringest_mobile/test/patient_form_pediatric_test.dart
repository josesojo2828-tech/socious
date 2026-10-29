// S2 (patient-onboarding) · C3 — alta de paciente PEDIÁTRICO (menor de edad)
// con REPRESENTANTE en la app móvil.
//
// Contrato con el servidor (`POST /api/patients`, C2):
//   - `isPediatric: true` → el alta es de un MENOR y exige el bloque
//     `representative` (el servidor responde 400 sin nombre y correo, ANTES
//     de escribir nada);
//   - la CUENTA del menor es la del REPRESENTANTE y la invitación por correo
//     va al correo del representante;
//   - `isPediatric` AUSENTE → el alta es EXACTAMENTE la de siempre.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nutringest_mobile/features/patients/models/patient_model.dart';
import 'package:nutringest_mobile/features/patients/presentation/pages/patient_form_page.dart';
import 'package:nutringest_mobile/features/patients/providers/patients_provider.dart';
import 'package:nutringest_mobile/features/patients/services/patient_service.dart';
import 'package:nutringest_mobile/features/patients/utils/pediatric_patient_option.dart';

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

const Key _pediatricKey = Key('patient-pediatric-switch');
const Key _invitationKey = Key('patient-invitation-checkbox');

Future<void> _openPatientForm(
  WidgetTester tester,
  PatientsProvider provider, {
  PatientModel? patient,
}) async {
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

Future<void> _acceptPrivacyNotice(WidgetTester tester) async {
  await tester.ensureVisible(find.byType(Checkbox));
  await tester.tap(find.byType(Checkbox));
  await tester.pumpAndSettle();
}

Future<void> _togglePediatric(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(_pediatricKey));
  await tester.tap(find.byKey(_pediatricKey));
  await tester.pumpAndSettle();
}

Future<void> _fillRepresentative(WidgetTester tester) async {
  await tester.ensureVisible(find.widgetWithText(TextFormField, 'ej. María Pérez'));
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ej. María Pérez'),
    'María Pérez',
  );
  await tester.ensureVisible(find.widgetWithText(TextFormField, 'ej. maria@ejemplo.com'));
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ej. maria@ejemplo.com'),
    'maria@example.com',
  );
  await tester.ensureVisible(find.widgetWithText(TextFormField, 'ej. +58 412 1234567'));
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ej. +58 412 1234567'),
    '+58 412 1234567',
  );
  await tester.pumpAndSettle();
}

Future<void> _selectRelationship(WidgetTester tester, String label) async {
  await tester.ensureVisible(
      find.byType(DropdownButtonFormField<RepresentativeRelationship>));
  await tester.tap(find.byType(DropdownButtonFormField<RepresentativeRelationship>));
  await tester.pumpAndSettle();
  await tester.tap(find.text(label).last);
  await tester.pumpAndSettle();
}

Future<void> _submit(WidgetTester tester) async {
  await tester.ensureVisible(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
  await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
  await tester.pumpAndSettle();
}

void main() {
  group('PatientFormPage — Paciente pediátrico (S2 · C3)', () {
    late _RecordingPatientService service;
    late PatientsProvider provider;

    setUp(() {
      service = _RecordingPatientService();
      provider = PatientsProvider(patientService: service);
    });

    testWidgets('ofrece la opción pediátrica al registrar un paciente nuevo',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);

      expect(find.byKey(_pediatricKey), findsOneWidget);
      expect(find.text('Es paciente pediátrico'), findsOneWidget);
    });

    testWidgets('no ofrece la opción pediátrica al editar un paciente ya registrado',
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

      expect(find.byKey(_pediatricKey), findsNothing);
    });

    testWidgets('con el interruptor apagado el payload es EXACTAMENTE el de antes',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(service.createdPayloads.length, 1);
      final payload = service.createdPayloads.first;
      expect(payload.containsKey('isPediatric'), isFalse);
      expect(payload.containsKey('representative'), isFalse);
      expect(
        payload.keys.toSet(),
        equals({
          'firstName',
          'lastName',
          'email',
          'phone',
          'dni',
          'birthDate',
          'gender',
          'status',
          'objective',
          'privacyNoticeAccepted',
        }),
        reason: 'sin la opción pediátrica el payload no puede cambiar ni en una clave',
      );
      // Diferencial: el payload COMPLETO (claves y valores) es el de HEAD.
      expect(
        payload,
        equals({
          'firstName': 'Sofía',
          'lastName': 'Rodríguez',
          'email': null,
          'phone': null,
          'dni': null,
          'birthDate': null,
          'gender': 'FEMALE',
          'status': 'ACTIVE',
          'objective': null,
          'privacyNoticeAccepted': true,
        }),
      );
    });

    testWidgets('al encender el interruptor pide los datos del representante',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _togglePediatric(tester);

      expect(find.text('DATOS DEL REPRESENTANTE'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'ej. María Pérez'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'ej. maria@ejemplo.com'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'ej. +58 412 1234567'), findsOneWidget);
    });

    testWidgets('el dropdown de parentesco ofrece los cuatro valores del servidor',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _togglePediatric(tester);

      await tester.ensureVisible(
          find.byType(DropdownButtonFormField<RepresentativeRelationship>));
      await tester.tap(
          find.byType(DropdownButtonFormField<RepresentativeRelationship>));
      await tester.pumpAndSettle();

      expect(find.text('Padre'), findsOneWidget);
      expect(find.text('Madre'), findsOneWidget);
      expect(find.text('Tutor'), findsOneWidget);
      expect(find.text('Otro'), findsOneWidget);
    });

    testWidgets('el correo del paciente queda opcional en modo pediátrico',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _togglePediatric(tester);

      expect(
        find.textContaining('El correo del paciente es opcional'),
        findsOneWidget,
      );
      expect(find.textContaining('Correo Electrónico (opcional)'), findsOneWidget);
    });

    testWidgets('exige el nombre y el correo del representante',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _togglePediatric(tester);
      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(find.textContaining('Debe confirmarse'), findsNothing);
      expect(find.textContaining('Ingresá el nombre del representante'), findsOneWidget);
      expect(find.textContaining('Ingresá el correo del representante'), findsOneWidget);
      expect(service.createdPayloads, isEmpty);
    });

    testWidgets('envía isPediatric y el bloque representative',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _togglePediatric(tester);
      await _fillRepresentative(tester);
      await _selectRelationship(tester, 'Madre');
      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(service.createdPayloads.length, 1);
      final payload = service.createdPayloads.first;
      expect(payload['isPediatric'], isTrue);
      expect(payload['representative'], isA<Map<String, dynamic>>());
      expect(payload['representative']['fullName'], 'María Pérez');
      expect(payload['representative']['email'], 'maria@example.com');
      expect(payload['representative']['phone'], '+58 412 1234567');
      expect(payload['representative']['relationship'], 'MADRE');
      expect(payload['privacyNoticeAccepted'], isTrue);
      // El payload COMPLETO del alta pediátrica.
      expect(
        payload,
        equals({
          'firstName': 'Sofía',
          'lastName': 'Rodríguez',
          'email': null,
          'phone': null,
          'dni': null,
          'birthDate': null,
          'gender': 'FEMALE',
          'status': 'ACTIVE',
          'objective': null,
          'privacyNoticeAccepted': true,
          'sendInvitation': true,
          'isPediatric': true,
          'representative': {
            'fullName': 'María Pérez',
            'email': 'maria@example.com',
            'phone': '+58 412 1234567',
            'relationship': 'MADRE',
          },
        }),
      );
    });

    testWidgets('la invitación por correo se envía al correo del representante',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _togglePediatric(tester);
      await _fillRepresentative(tester);

      // El destinatario es el representante: la casilla se activa sola con su
      // correo, aunque el paciente no tenga correo propio.
      expect(find.byIcon(Icons.check_box_rounded), findsOneWidget);
      expect(
        find.textContaining('La invitación se enviará al correo del representante'),
        findsOneWidget,
      );

      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(service.createdPayloads.length, 1);
      expect(service.createdPayloads.first['sendInvitation'], isTrue);
    });

    testWidgets('sin el correo del representante la invitación avisa y no registra',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _togglePediatric(tester);

      // El profesional marca la invitación a mano sin correo del
      // representante: el aviso aparece y el alta no se manda.
      await tester.ensureVisible(find.byKey(_invitationKey));
      await tester.tap(find.byKey(_invitationKey));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('El representante necesita un correo para recibir la invitación'),
        findsOneWidget,
      );

      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(service.createdPayloads, isEmpty);
    });

    testWidgets('la atestación del Aviso de Privacidad sigue siendo obligatoria en modo pediátrico',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _togglePediatric(tester);
      await _fillRepresentative(tester);

      await _submit(tester);

      expect(find.textContaining('Debe confirmarse'), findsOneWidget);
      expect(service.createdPayloads, isEmpty);
    });

    testWidgets('el formulario pediatrico sigue teniendo UN solo Checkbox (el del Aviso de Privacidad)',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _togglePediatric(tester);

      expect(find.byType(Checkbox), findsOneWidget);
      expect(find.byType(Switch), findsOneWidget);
    });

    // PRESERVE: el correo del paciente se validaba con el mismo patrón antes
    // de este cambio (ahora comparte el helper del módulo puro).
    testWidgets('un correo de paciente inválido sigue siendo rechazado',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await tester.enterText(
        find.widgetWithText(TextFormField, 'ejemplo@paciente.com'),
        'no-es-un-correo',
      );
      await tester.pumpAndSettle();
      await _acceptPrivacyNotice(tester);
      await _submit(tester);

      expect(find.textContaining('Ingresá un correo electrónico válido'), findsOneWidget);
      expect(service.createdPayloads, isEmpty);
    });
  });
}
