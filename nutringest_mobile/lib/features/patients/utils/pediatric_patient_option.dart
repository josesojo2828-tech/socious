/// S2 (patient-onboarding) · C3 — lógica pura del alta de un paciente
/// PEDIÁTRICO (menor de edad) con REPRESENTANTE en la app móvil.
///
/// Este módulo NO importa Flutter: es lógica de decisión y armado de payload,
/// sin widgets ni red.
///
/// Contrato con el servidor (`POST /api/patients`, C2):
///   - `isPediatric: true` → el alta es de un MENOR y el bloque
///     `representative` es OBLIGATORIO: sin nombre y correo el servidor
///     responde 400 ANTES de escribir nada;
///   - la CUENTA del menor es la del REPRESENTANTE (su portal muestra al
///     menor) y la invitación por correo va al CORREO DEL REPRESENTANTE;
///   - `isPediatric` AUSENTE → el alta es EXACTAMENTE la de siempre: el
///     payload no lleva ni `isPediatric` ni `representative`.
///
/// El parentesco lo acepta el servidor como `PADRE | MADRE | TUTOR | OTRO`
/// (`REPRESENTATIVE_RELATIONSHIPS` en `patient.service.ts`); es opcional: si
/// el profesional no elige ninguno, la clave viaja ausente.
library;

/// Patrón de validación de correo (el mismo del formulario de paciente).
final RegExp patientEmailPattern =
    RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');

/// ¿El texto es un correo válido?
bool isValidPatientEmail(String email) =>
    patientEmailPattern.hasMatch(email.trim());

/// Parentesco del representante (los mismos valores que acepta el servidor).
enum RepresentativeRelationship {
  padre('PADRE', 'Padre'),
  madre('MADRE', 'Madre'),
  tutor('TUTOR', 'Tutor'),
  otro('OTRO', 'Otro');

  const RepresentativeRelationship(this.value, this.label);

  /// Valor que viaja en el payload (`PADRE`, `MADRE`, `TUTOR`, `OTRO`).
  final String value;

  /// Etiqueta que ve el profesional en el dropdown.
  final String label;
}

/// Estado del formulario de alta con respecto a la opción pediátrica.
class PediatricPatientState {
  const PediatricPatientState({
    required this.isPediatric,
    required this.patientEmail,
    required this.representativeFullName,
    required this.representativeEmail,
    required this.representativePhone,
    required this.relationship,
  });

  /// El interruptor "Es paciente pediátrico" está encendido.
  final bool isPediatric;

  /// Correo propio del paciente (opcional cuando es menor).
  final String patientEmail;

  /// Nombre del representante.
  final String representativeFullName;

  /// Correo del representante (obligatorio cuando es menor).
  final String representativeEmail;

  /// Teléfono del representante (opcional).
  final String representativePhone;

  /// Parentesco elegido (opcional).
  final RepresentativeRelationship? relationship;

  /// ¿El correo del paciente sigue siendo obligatorio?
  ///
  /// Cuando el alta es de un MENOR, la cuenta se crea con el correo del
  /// REPRESENTANTE: el correo propio del paciente pasa a ser opcional.
  bool get patientEmailRequired => !isPediatric;

  /// El nombre del representante está informado.
  bool get representativeNameValid => representativeFullName.trim().isNotEmpty;

  /// El correo del representante está informado y es válido.
  bool get representativeEmailValid => isValidPatientEmail(representativeEmail);

  /// El representante está completo (el servidor exige nombre y correo).
  bool get representativeValid =>
      representativeNameValid && representativeEmailValid;

  /// Falta el nombre del representante.
  bool get missingRepresentativeName =>
      isPediatric && !representativeNameValid;

  /// Falta (o es inválido) el correo del representante.
  bool get missingRepresentativeEmail =>
      isPediatric && !representativeEmailValid;

  /// El formulario se puede enviar.
  bool get canSubmit => !isPediatric || representativeValid;

  /// Destinatario de la invitación por correo: el del representante si el
  /// alta es de un menor, el del paciente si no.
  String get invitationEmail =>
      isPediatric ? representativeEmail.trim() : patientEmail.trim();

  /// Bloque `representative` del payload (valores ya normalizados).
  Map<String, dynamic> get representativePayload => {
        'fullName': representativeFullName.trim(),
        'email': representativeEmail.trim(),
        'phone': representativePhone.trim().isEmpty
            ? null
            : representativePhone.trim(),
        if (relationship != null) 'relationship': relationship!.value,
      };

  /// Claves extra del payload: SOLO cuando el alta es pediátrica.
  ///
  /// Con el interruptor apagado devuelve un mapa VACÍO: el payload del alta
  /// es exactamente el de siempre, ni una clave más.
  Map<String, dynamic> get payloadExtras => isPediatric
      ? {
          'isPediatric': true,
          'representative': representativePayload,
        }
      : const <String, dynamic>{};
}

/// Estado efectivo del alta a partir de los datos del formulario.
///
/// - interruptor apagado → el alta es la de siempre (correo del paciente
///   obligatorio, sin claves pediatricas en el payload);
/// - interruptor encendido → el correo del paciente es opcional, el
///   representante es obligatorio (nombre y correo) y el destinatario de la
///   invitación pasa a ser el representante.
PediatricPatientState resolvePediatricPatient({
  required bool isPediatric,
  required String patientEmail,
  required String representativeFullName,
  required String representativeEmail,
  required String representativePhone,
  required RepresentativeRelationship? relationship,
}) {
  return PediatricPatientState(
    isPediatric: isPediatric,
    patientEmail: patientEmail,
    representativeFullName: representativeFullName,
    representativeEmail: representativeEmail,
    representativePhone: representativePhone,
    relationship: relationship,
  );
}

/// Claves que el alta pediátrica agrega al payload.
///
/// Con el interruptor apagado devuelve un mapa vacío: el payload no cambia.
Map<String, dynamic> buildPediatricPayload(PediatricPatientState state) =>
    state.payloadExtras;
