// S1 (patient-onboarding) · D2c — opción "Enviar invitación por correo" del
// ALTA de paciente de la app móvil.
//
// Contrato con el servidor (`POST /api/patients`, D2a):
//   - `sendInvitation: true` → la cuenta del paciente nace SIN contraseña
//     utilizable y el paciente define la suya con el enlace del correo;
//   - `sendInvitation` AUSENTE → el alta es exactamente la de siempre;
//   - `sendInvitation: true` SIN correo → 400 ("el paciente necesita un
//     correo para recibir la invitación"), así que la app avisa y NO envía.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nutringest_mobile/features/patients/models/patient_model.dart';
import 'package:nutringest_mobile/features/patients/presentation/pages/patient_form_page.dart';
import 'package:nutringest_mobile/features/patients/providers/patients_provider.dart';
import 'package:nutringest_mobile/features/patients/services/patient_service.dart';

/// S1 (patient-onboarding) · D2c — opción "Enviar invitación por correo" del
/// ALTA de paciente de la app móvil.
///
/// Contrato con el servidor (`POST /api/patients`, D2a):
///   - `sendInvitation: true` → la cuenta del paciente nace SIN contraseña
///     utilizable y el paciente define la suya con el enlace del correo;
///   - `sendInvitation` AUSENTE → el alta es exactamente la de siempre;
///   - `sendInvitation: true` SIN correo → 400 ("el paciente necesita un
///     correo para recibir la invitación"), así que la app avisa y NO envía.
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

const Key _invitationKey = Key('patient-invitation-checkbox');

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

Future<void> _enterEmail(WidgetTester tester, String email) async {
  await tester.enterText(
    find.widgetWithText(TextFormField, 'ejemplo@paciente.com'),
    email,
  );
  await tester.pumpAndSettle();
}

Future<void> _tapInvitation(WidgetTester tester) async {
  await tester.tap(find.byKey(_invitationKey));
  await tester.pumpAndSettle();
}

void main() {
  group('PatientFormPage — Invitación por correo (S1 · D2c)', () {
    late _RecordingPatientService service;
    late PatientsProvider provider;

    setUp(() {
      service = _RecordingPatientService();
      provider = PatientsProvider(patientService: service);
    });

    testWidgets('ofrece la opción de invitación al registrar un paciente nuevo',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);

      expect(find.byKey(_invitationKey), findsOneWidget);
      expect(find.text('Enviar invitación por correo'), findsOneWidget);
      // La copia explica las dos consecuencias: el paciente crea su propia
      // contraseña y el enlace vence a las 72 horas.
      expect(
        find.textContaining('El paciente recibirá un correo con un enlace para crear su contraseña'),
        findsOneWidget,
      );
      expect(find.textContaining('72 horas'), findsOneWidget);
    });

    testWidgets('la casilla viene activada por defecto cuando el paciente tiene correo',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _enterEmail(tester, 'paciente@ejemplo.com');

      expect(
        find.byIcon(Icons.check_box_rounded),
        findsOneWidget,
        reason: 'con correo, la casilla de invitación debe venir activada',
      );
      expect(find.byIcon(Icons.check_box_outline_blank_rounded), findsNothing);
    });

    testWidgets('la casilla sigue activada mientras el profesional no la toque',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _enterEmail(tester, 'paciente@ejemplo.com');
      await _enterEmail(tester, 'paciente@ejemplo.com.ar');

      expect(find.byIcon(Icons.check_box_rounded), findsOneWidget);
    });

    testWidgets('si el profesional desmarca la casilla, su decisión manda',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _enterEmail(tester, 'paciente@ejemplo.com');
      expect(find.byIcon(Icons.check_box_rounded), findsOneWidget);

      await _tapInvitation(tester);
      expect(find.byIcon(Icons.check_box_outline_blank_rounded), findsOneWidget);

      // Cambiar el correo NO vuelve a activar la casilla.
      await _enterEmail(tester, 'otro@ejemplo.com');
      expect(find.byIcon(Icons.check_box_outline_blank_rounded), findsOneWidget);
      expect(find.byIcon(Icons.check_box_rounded), findsNothing);
    });

    testWidgets('envía sendInvitation true cuando la invitación está habilitada',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _enterEmail(tester, 'paciente@ejemplo.com');

      // La atestación del Aviso de Privacidad sigue siendo obligatoria.
      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads.length, 1);
      expect(service.createdPayloads.first['sendInvitation'], isTrue);
      expect(service.createdPayloads.first['privacyNoticeAccepted'], isTrue);
    });

    testWidgets('no manda el flag sendInvitation cuando la invitación está desactivada',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads.length, 1);
      // Sin la clave: el payload es EXACTAMENTE el de antes.
      expect(service.createdPayloads.first.containsKey('sendInvitation'), isFalse);
      expect(
        service.createdPayloads.first.keys.toSet(),
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
        reason: 'sin invitación el payload no puede cambiar ni en una clave',
      );
      expect(service.createdPayloads.first['privacyNoticeAccepted'], isTrue);
    });

    testWidgets('no manda el flag sendInvitation si el profesional desmarca la casilla',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _enterEmail(tester, 'paciente@ejemplo.com');

      await _tapInvitation(tester);

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads.length, 1);
      expect(service.createdPayloads.first.containsKey('sendInvitation'), isFalse);
    });

    testWidgets(
        'avisa y no registra al paciente si la invitación está activada y no hay correo',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _tapInvitation(tester);

      expect(
        find.textContaining('El paciente necesita un correo para recibir la invitación'),
        findsOneWidget,
      );

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads, isEmpty);
    });

    testWidgets(
        'si el profesional marca la casilla sin correo y después escribe el correo, la casilla sigue marcada',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _tapInvitation(tester);
      expect(find.byIcon(Icons.check_box_rounded), findsOneWidget);
      expect(
        find.textContaining('El paciente necesita un correo para recibir la invitación'),
        findsOneWidget,
      );

      await _enterEmail(tester, 'paciente@ejemplo.com');

      // La decisión del profesional manda: la casilla sigue marcada y el
      // aviso de "falta el correo" desaparece.
      expect(find.byIcon(Icons.check_box_rounded), findsOneWidget);
      expect(
        find.textContaining('El paciente necesita un correo para recibir la invitación'),
        findsNothing,
      );

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(service.createdPayloads.length, 1);
      expect(service.createdPayloads.first['sendInvitation'], isTrue);
    });

    testWidgets(
        'el aviso de correo faltante reaparece si el profesional borra el correo con la casilla marcada',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);

      await _tapInvitation(tester);
      await _enterEmail(tester, 'paciente@ejemplo.com');
      expect(
        find.textContaining('El paciente necesita un correo para recibir la invitación'),
        findsNothing,
      );

      await _enterEmail(tester, '');

      expect(
        find.textContaining('El paciente necesita un correo para recibir la invitación'),
        findsOneWidget,
      );
    });

    testWidgets('la atestación del Aviso de Privacidad sigue siendo obligatoria',
        (WidgetTester tester) async {
      await _openPatientForm(tester, provider);
      await _fillRequiredNames(tester);
      await _enterEmail(tester, 'paciente@ejemplo.com');

      await tester.tap(find.widgetWithText(ElevatedButton, 'Registrar Paciente'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Debe confirmarse'), findsOneWidget);
      expect(service.createdPayloads, isEmpty);
    });

    testWidgets('no ofrece la invitación al editar un paciente ya registrado',
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

      expect(find.byKey(_invitationKey), findsNothing);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Guardar Cambios'));
      await tester.pumpAndSettle();

      expect(service.updatedPayloads.length, 1);
      expect(service.updatedPayloads.first.containsKey('sendInvitation'), isFalse);
      expect(service.createdPayloads, isEmpty);
    });
  });
}
