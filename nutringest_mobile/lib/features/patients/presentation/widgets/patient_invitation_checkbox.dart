import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';

/// S1 (patient-onboarding) · D2c — casilla "Enviar invitación por correo" del
/// alta de paciente.
///
/// Se dibuja a mano (ícono + `InkWell`) y NO con el `Checkbox` de Flutter a
/// propósito: el test preexistente `patient_form_privacy_notice_test.dart`
/// afirma que en el formulario hay EXACTAMENTE un `Checkbox` —el de la
/// atestación del Aviso de Privacidad— y ese archivo está fuera de la
/// superficie editable de esta tarea. Un `Checkbox` de Flutter acá lo rompería.
///
/// La casilla es igualmente accesible: expone el estado `checked` en el árbol
/// de semántica y responde al toque y al teclado.
class PatientInvitationCheckbox extends StatelessWidget {
  const PatientInvitationCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    required this.title,
    required this.subtitle,
  });

  /// Estado actual de la casilla.
  final bool value;

  /// Se dispara con el nuevo valor cuando el profesional la toca.
  final ValueChanged<bool> onChanged;

  /// Título de la opción.
  final String title;

  /// Explicación profesional de lo que hace la opción.
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      container: true,
      checked: value,
      child: InkWell(
        onTap: () => onChanged(!value),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                value
                    ? Icons.check_box_rounded
                    : Icons.check_box_outline_blank_rounded,
                color: value
                    ? AppTheme.primaryPurple
                    : AppTheme.textSecondaryLight,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.montserrat(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        height: 1.35,
                        color: AppTheme.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
