import 'package:flutter_test/flutter_test.dart';
import 'package:nutringest_mobile/features/patients/utils/patient_invitation_option.dart';

/// S1 (patient-onboarding) · D2c — lógica pura de la opción "Enviar
/// invitación por correo" del alta de paciente de la app móvil.
///
/// El módulo NO importa Flutter: es lógica de decisión y se prueba sin
/// widget. El wiring con el formulario se verifica en
/// `patient_form_invitation_test.dart`.
void main() {
  group('estado de la invitación por correo (S1 · D2c)', () {
    test('el correo del paciente es el que decide si hay invitación', () {
      expect(hasPatientEmail('paciente@ejemplo.com'), isTrue);
      expect(hasPatientEmail('  paciente@ejemplo.com  '), isTrue);
      expect(hasPatientEmail(''), isFalse);
      expect(hasPatientEmail('   '), isFalse);
    });

    test('la invitación viene activada por defecto solo si el paciente tiene correo', () {
      expect(defaultSendInvitation('paciente@ejemplo.com'), isTrue);
      expect(defaultSendInvitation(''), isFalse);
    });

    test('marcada y con correo: la invitación queda habilitada y se manda el flag', () {
      final state = resolvePatientInvitation(
        email: 'paciente@ejemplo.com',
        sendInvitation: true,
      );

      expect(state.hasEmail, isTrue);
      expect(state.checked, isTrue);
      expect(state.enabled, isTrue);
      expect(state.missingEmail, isFalse);
      expect(state.canSubmit, isTrue);
      expect(state.sendFlag, isTrue);
    });

    test('marcada y sin correo: hay que avisar y NO se manda el flag', () {
      final state = resolvePatientInvitation(email: '', sendInvitation: true);

      expect(state.hasEmail, isFalse);
      expect(state.checked, isTrue);
      expect(state.enabled, isFalse);
      expect(state.missingEmail, isTrue);
      expect(state.canSubmit, isFalse);
      expect(state.sendFlag, isFalse);
    });

    test('desmarcada: no hay invitación y el alta es la de siempre', () {
      final state = resolvePatientInvitation(
        email: 'paciente@ejemplo.com',
        sendInvitation: false,
      );

      expect(state.checked, isFalse);
      expect(state.enabled, isFalse);
      expect(state.missingEmail, isFalse);
      expect(state.canSubmit, isTrue);
      expect(state.sendFlag, isFalse);
    });

    test('la casilla sigue al correo mientras el profesional no la toque', () {
      expect(
        nextSendInvitation(email: 'paciente@ejemplo.com', current: false, touched: false),
        isTrue,
      );
      expect(
        nextSendInvitation(email: '', current: true, touched: false),
        isFalse,
      );
    });

    test('si el profesional tocó la casilla, su decisión manda', () {
      expect(
        nextSendInvitation(email: 'paciente@ejemplo.com', current: false, touched: true),
        isFalse,
      );
      expect(
        nextSendInvitation(email: '', current: true, touched: true),
        isTrue,
      );
    });

    test('la vigencia del enlace es la del servidor: 72 horas', () {
      expect(patientInvitationExpiryHours, 72);
    });
  });
}
