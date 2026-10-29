/// S1 (patient-onboarding) · D2c — lógica pura de la opción "Enviar
/// invitación por correo" del ALTA de paciente de la app móvil.
///
/// Este módulo NO importa Flutter: es lógica de decisión, sin widgets ni red.
///
/// Contrato con el servidor (`POST /api/patients`, D2a):
///   - `sendInvitation: true` → la cuenta del paciente nace SIN contraseña
///     utilizable (`password: null`, `mustChangePassword: true`) y el paciente
///     define la suya con el enlace de la invitación por correo;
///   - `sendInvitation` AUSENTE → comportamiento de siempre (la contraseña la
///     pone el profesional);
///   - `sendInvitation: true` SIN correo → 400 ("el paciente necesita un
///     correo para recibir la invitación"). Por eso la app NUNCA pide la
///     invitación sin correo: avisa y no envía.
///
/// El plazo de expiración de la invitación (72 h) es el del servidor
/// (`PatientInvitationService`), no una decisión de la UI.
library;

/// Vigencia del enlace de invitación, en horas (la del servidor).
const int patientInvitationExpiryHours = 72;

/// ¿El paciente tiene correo? (sin correo no hay a quién invitar).
bool hasPatientEmail(String email) => email.trim().isNotEmpty;

/// Estado por defecto de la casilla: activada si el paciente tiene correo.
/// Con el correo vacío la casilla queda apagada, porque una invitación sin
/// destinatario no se puede enviar.
bool defaultSendInvitation(String email) => hasPatientEmail(email);

/// Estado del formulario de alta con respecto a la invitación.
class PatientInvitationState {
  const PatientInvitationState({
    required this.hasEmail,
    required this.checked,
    required this.enabled,
    required this.missingEmail,
  });

  /// El paciente tiene correo (hay a quién invitar).
  final bool hasEmail;

  /// La casilla está marcada.
  final bool checked;

  /// La invitación es posible: marcada Y con correo.
  final bool enabled;

  /// Marcada pero sin correo: el servidor la rechazaría con 400.
  final bool missingEmail;

  /// El formulario se puede enviar.
  bool get canSubmit => !missingEmail;

  /// Hay que mandar el flag `sendInvitation` al servidor.
  bool get sendFlag => enabled;
}

/// Estado efectivo de la invitación a partir del correo y de la casilla.
///
/// - marcada + correo → habilitada, se manda el flag;
/// - marcada + sin correo → `missingEmail`: hay que avisar y NO se puede
///   enviar el formulario (el servidor lo rechazaría con 400);
/// - desmarcada → no hay invitación, el alta es la de siempre.
PatientInvitationState resolvePatientInvitation({
  required String email,
  required bool sendInvitation,
}) {
  final hasEmail = hasPatientEmail(email);
  final checked = sendInvitation;

  return PatientInvitationState(
    hasEmail: hasEmail,
    checked: checked,
    enabled: checked && hasEmail,
    missingEmail: checked && !hasEmail,
  );
}

/// Siguiente estado de la casilla cuando cambia el correo del paciente.
///
/// Mientras el profesional NO haya tocado la casilla, esta sigue al correo
/// (se activa sola cuando hay correo). Si la tocó, su decisión manda: no se
/// le cambia la casilla por debajo.
bool nextSendInvitation({
  required String email,
  required bool current,
  required bool touched,
}) {
  if (touched) {
    return current;
  }

  return defaultSendInvitation(email);
}
