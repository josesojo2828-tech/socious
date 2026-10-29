// S2 (patient-onboarding) · C3 — lógica pura del alta de un paciente
// PEDIÁTRICO (menor de edad) con REPRESENTANTE en la app móvil.
//
// Contrato con el servidor (`POST /api/patients`, C2):
//   - `isPediatric: true` → el alta es de un MENOR y exige el bloque
//     `representative` (el servidor responde 400 sin nombre y correo, ANTES
//     de escribir nada);
//   - la CUENTA del menor es la del REPRESENTANTE y la invitación por correo
//     va al correo del representante;
//   - `isPediatric` AUSENTE → el alta es EXACTAMENTE la de siempre.
import 'package:flutter_test/flutter_test.dart';
import 'package:nutringest_mobile/features/patients/utils/pediatric_patient_option.dart';

PediatricPatientState _state({
  bool isPediatric = false,
  String patientEmail = 'paciente@ejemplo.com',
  String representativeFullName = '',
  String representativeEmail = '',
  String representativePhone = '',
  RepresentativeRelationship? relationship,
}) {
  return resolvePediatricPatient(
    isPediatric: isPediatric,
    patientEmail: patientEmail,
    representativeFullName: representativeFullName,
    representativeEmail: representativeEmail,
    representativePhone: representativePhone,
    relationship: relationship,
  );
}

void main() {
  group('Correo electrónico', () {
    test('el patrón compartido es el que usa el formulario de paciente', () {
      expect(isValidPatientEmail('maria@example.com'), isTrue);
      expect(isValidPatientEmail('  maria@example.com  '), isTrue);
      expect(isValidPatientEmail('no-es-un-correo'), isFalse);
      expect(isValidPatientEmail('con espacio@example.com'), isFalse);
      expect(isValidPatientEmail(''), isFalse);
    });
  });

  group('Representante — parentescos', () {    test('expone los mismos valores que acepta el servidor', () {
      expect(
        RepresentativeRelationship.values.map((r) => r.value).toList(),
        equals(['PADRE', 'MADRE', 'TUTOR', 'OTRO']),
      );
    });

    test('las etiquetas son legibles en español', () {
      expect(RepresentativeRelationship.padre.label, 'Padre');
      expect(RepresentativeRelationship.madre.label, 'Madre');
      expect(RepresentativeRelationship.tutor.label, 'Tutor');
      expect(RepresentativeRelationship.otro.label, 'Otro');
    });
  });

  group('Estado del alta pediátrica', () {
    test('con el interruptor apagado el alta es la de siempre', () {
      final state = _state();

      expect(state.isPediatric, isFalse);
      expect(state.patientEmailRequired, isTrue);
      expect(state.canSubmit, isTrue);
      expect(state.payloadExtras, isEmpty);
      expect(state.invitationEmail, 'paciente@ejemplo.com');
    });

    test('con el interruptor apagado el payload no lleva las claves pediatricas', () {
      final state = _state(
        representativeFullName: 'María Pérez',
        representativeEmail: 'maria@example.com',
      );

      expect(state.payloadExtras.containsKey('isPediatric'), isFalse);
      expect(state.payloadExtras.containsKey('representative'), isFalse);
    });

    test('con el interruptor encendido el correo del paciente es opcional', () {
      final state = _state(
        isPediatric: true,
        patientEmail: '',
        representativeFullName: 'María Pérez',
        representativeEmail: 'maria@example.com',
      );

      expect(state.patientEmailRequired, isFalse);
      expect(state.canSubmit, isTrue);
    });

    test('con el interruptor encendido el destinatario de la invitación es el representante', () {
      final state = _state(
        isPediatric: true,
        patientEmail: 'menor@ejemplo.com',
        representativeFullName: 'María Pérez',
        representativeEmail: 'maria@example.com',
      );

      expect(state.invitationEmail, 'maria@example.com');
    });

    test('el representante es obligatorio: sin nombre no se puede enviar', () {
      final state = _state(
        isPediatric: true,
        representativeEmail: 'maria@example.com',
      );

      expect(state.representativeNameValid, isFalse);
      expect(state.representativeEmailValid, isTrue);
      expect(state.canSubmit, isFalse);
      expect(state.missingRepresentativeName, isTrue);
      expect(state.missingRepresentativeEmail, isFalse);
    });

    test('el representante es obligatorio: sin correo no se puede enviar', () {
      final state = _state(
        isPediatric: true,
        representativeFullName: 'María Pérez',
      );

      expect(state.representativeNameValid, isTrue);
      expect(state.representativeEmailValid, isFalse);
      expect(state.canSubmit, isFalse);
      expect(state.missingRepresentativeEmail, isTrue);
      expect(state.missingRepresentativeName, isFalse);
    });

    test('un correo de representante inválido no habilita el envío', () {
      final state = _state(
        isPediatric: true,
        representativeFullName: 'María Pérez',
        representativeEmail: 'no-es-un-correo',
      );

      expect(state.representativeEmailValid, isFalse);
      expect(state.canSubmit, isFalse);
    });

    test('el teléfono del representante es opcional', () {
      final state = _state(
        isPediatric: true,
        representativeFullName: 'María Pérez',
        representativeEmail: 'maria@example.com',
      );

      expect(state.canSubmit, isTrue);
      expect(state.representativePayload['phone'], isNull);
    });

    test('el payload pediátrico lleva isPediatric y el bloque representative', () {
      final state = _state(
        isPediatric: true,
        representativeFullName: '  María Pérez  ',
        representativeEmail: ' maria@example.com ',
        representativePhone: ' +58 412 1234567 ',
        relationship: RepresentativeRelationship.madre,
      );

      expect(state.payloadExtras['isPediatric'], isTrue);
      expect(state.payloadExtras['representative'], equals({
        'fullName': 'María Pérez',
        'email': 'maria@example.com',
        'phone': '+58 412 1234567',
        'relationship': 'MADRE',
      }));
    });

    test('sin parentesco elegido el payload lo omite (el servidor lo acepta vacío)', () {
      final state = _state(
        isPediatric: true,
        representativeFullName: 'María Pérez',
        representativeEmail: 'maria@example.com',
      );

      expect(state.payloadExtras['representative'].containsKey('relationship'), isFalse);
    });
  });
}
