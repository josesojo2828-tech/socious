import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/patient_model.dart';
import '../../providers/patients_provider.dart';
import '../../utils/patient_invitation_option.dart';
import '../../utils/pediatric_patient_option.dart';
import '../widgets/patient_invitation_checkbox.dart';

class PatientFormPage extends StatefulWidget {
  final PatientModel? patient;

  const PatientFormPage({super.key, this.patient});

  @override
  State<PatientFormPage> createState() => _PatientFormPageState();
}

class _PatientFormPageState extends State<PatientFormPage> {
  final _formKey = GlobalKey<FormState>();

  /// Documento legal público donde se puede leer el Aviso de Privacidad vigente.
  static const String _privacyNoticeUrl = 'https://nutringest.com/privacy';

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _dniController;
  late TextEditingController _objectiveController;
  late TextEditingController _representativeNameController;
  late TextEditingController _representativeEmailController;
  late TextEditingController _representativePhoneController;

  DateTime? _selectedBirthDate;
  String _selectedGender = 'FEMALE';
  String _selectedStatus = 'ACTIVE';
  bool _isSaving = false;

  /// S1 (patient-onboarding) · D2c: el profesional ofrece al paciente que
  /// defina su propia contraseña con la invitación por correo. La casilla
  /// sigue al correo mientras el profesional no la toque (no hay a quién
  /// invitar sin correo); si la toca, su decisión manda.
  bool _sendInvitation = false;
  bool _sendInvitationTouched = false;

  /// S2 (patient-onboarding) · C3: el alta de un MENOR. El interruptor en
  ///ciende el registro pediátrico y habilita los datos del REPRESENTANTE
  /// (obligatorios para el servidor).
  bool _isPediatric = false;

  /// Parentesco del representante elegido por el profesional (opcional).
  RepresentativeRelationship? _representativeRelationship;

  bool get isEditing => widget.patient != null;

  /// Estado actual de la opción de invitación por correo.
  ///
  /// El destinatario depende del modo: el paciente, o el REPRESENTANTE si
  /// el alta es de un menor (la cuenta del menor es la del representante).
  PatientInvitationState get _invitationState => resolvePatientInvitation(
        email: _pediatricState.invitationEmail,
        sendInvitation: _sendInvitation,
      );

  /// Estado actual de la opción pediatrico (S2 · C3).
  PediatricPatientState get _pediatricState => resolvePediatricPatient(
        isPediatric: _isPediatric,
        patientEmail: _emailController.text,
        representativeFullName: _representativeNameController.text,
        representativeEmail: _representativeEmailController.text,
        representativePhone: _representativePhoneController.text,
        relationship: _representativeRelationship,
      );

  /// Aviso de que falta el destinatario de la invitación. En modo pediátrico
  /// el destinatario es el REPRESENTANTE, no el paciente.
  String get _invitationMissingEmailMessage => _isPediatric
      ? 'El representante necesita un correo para recibir la invitación: '
          'escriba su correo o desmarque la opción.'
      : 'El paciente necesita un correo para recibir la invitación: '
          'escriba su correo o desmarque la opción.';

  @override
  void initState() {
    super.initState();
    final p = widget.patient;

    _firstNameController = TextEditingController(text: p?.firstName ?? '');
    _lastNameController = TextEditingController(text: p?.lastName ?? '');
    _emailController = TextEditingController(text: p?.email ?? '');
    _phoneController = TextEditingController(text: p?.phone ?? '');
    _dniController = TextEditingController(text: p?.dni ?? '');
    _objectiveController = TextEditingController(text: p?.objective ?? '');
    _representativeNameController = TextEditingController();
    _representativeEmailController = TextEditingController();
    _representativePhoneController = TextEditingController();

    _selectedBirthDate = p?.birthDate;
    _selectedGender = p?.gender?.toUpperCase() ?? 'FEMALE';
    if (!['MALE', 'FEMALE', 'OTHER'].contains(_selectedGender)) {
      _selectedGender = 'OTHER';
    }
    _selectedStatus = p?.status.toUpperCase() ?? 'ACTIVE';

    // La invitación solo existe en el ALTA: en la edición no se pide.
    if (!isEditing) {
      _sendInvitation = defaultSendInvitation(_emailController.text);
      _emailController.addListener(_handleEmailChanged);
      _representativeEmailController
          .addListener(_handleRepresentativeEmailChanged);
    }
  }

  @override
  void dispose() {
    _emailController.removeListener(_handleEmailChanged);
    _representativeEmailController
        .removeListener(_handleRepresentativeEmailChanged);
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dniController.dispose();
    _objectiveController.dispose();
    _representativeNameController.dispose();
    _representativeEmailController.dispose();
    _representativePhoneController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = _selectedBirthDate ?? DateTime(now.year - 25, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1920),
      lastDate: now,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppTheme.primaryPurple,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedBirthDate = picked;
      });
    }
  }

  Future<void> _openPrivacyNotice() async {
    final uri = Uri.parse(_privacyNoticeUrl);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo abrir el Aviso de Privacidad en este dispositivo.'),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al intentar abrir el Aviso de Privacidad.'),
          ),
        );
      }
    }
  }

  /// S1 · D2c: mientras el profesional no haya tocado la casilla, esta sigue
  /// al correo del paciente (se activa sola cuando hay correo). Si la tocó,
  /// su decisión manda y no se le cambia por debajo.
  void _handleEmailChanged() {
    if (isEditing) return;

    // S2 · C3: en modo pediátrico el destinatario de la invitación es el
    // REPRESENTANTE: el correo del paciente no la habilita ni la deshabilita.
    if (_isPediatric) return;

    setState(() {
      _sendInvitation = nextSendInvitation(
        email: _emailController.text,
        current: _sendInvitation,
        touched: _sendInvitationTouched,
      );
    });
  }

  /// S2 · C3: el correo del REPRESENTANTE es el destinatario de la
  /// invitación mientras el alta sea pediátrica. Mismo criterio que el
  /// correo del paciente: si el profesional tocó la casilla, su decisión
  /// manda.
  void _handleRepresentativeEmailChanged() {
    if (isEditing) return;
    if (!_isPediatric) return;

    setState(() {
      _sendInvitation = nextSendInvitation(
        email: _representativeEmailController.text,
        current: _sendInvitation,
        touched: _sendInvitationTouched,
      );
    });
  }

  /// S2 · C3: el profesional enciende o apaga el registro pediátrico.
  ///
  /// Al cambiar el modo cambia el DESTINATARIO de la invitación (paciente →
  /// representante), así que la casilla vuelve a seguir al correo del
  /// destinatario, salvo que el profesional la haya tocado a mano.
  void _togglePediatric(bool value) {
    setState(() {
      _isPediatric = value;
      _sendInvitation = nextSendInvitation(
        email: _pediatricState.invitationEmail,
        current: _sendInvitation,
        touched: _sendInvitationTouched,
      );
    });
  }

  /// S1 · D2c: el profesional marca o desmarca la casilla a mano.
  void _toggleSendInvitation(bool value) {
    setState(() {
      _sendInvitationTouched = true;
      _sendInvitation = value;
    });
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    // S1 · D2c: sin correo no hay a quién invitar y el servidor rechaza el
    // alta con 400. Se avisa y NO se manda el pedido.
    if (_invitationState.missingEmail) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_invitationMissingEmailMessage),
          backgroundColor: AppTheme.errorRed,
        ),
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isSaving = true;
    });

    final formData = <String, dynamic>{
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      'email': _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
      'phone': _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      'dni': _dniController.text.trim().isNotEmpty ? _dniController.text.trim() : null,
      'birthDate': _selectedBirthDate?.toIso8601String(),
      'gender': _selectedGender,
      'status': _selectedStatus,
      'objective': _objectiveController.text.trim().isNotEmpty ? _objectiveController.text.trim() : null,
      // S5 legal-compliance: el registro presencial solo se guarda si el
      // profesional atestigua que el paciente recibió y aceptó el Aviso de
      // Privacidad (la validación del formulario lo exige antes de enviar).
      if (!isEditing) 'privacyNoticeAccepted': true,
      // S1 · D2c: la invitación por correo solo viaja cuando está habilitada
      // (casilla marcada Y el paciente tiene correo). Sin esta clave el alta
      // es EXACTAMENTE la de antes.
      if (!isEditing && _invitationState.sendFlag) 'sendInvitation': true,
      // S2 · C3: las claves pediatricas viajan SOLO con el interruptor
      // encendido. Con el interruptor apagado el payload es EXACTAMENTE el
      // de antes, ni una clave más.
      if (!isEditing) ..._pediatricState.payloadExtras,
    };

    final provider = context.read<PatientsProvider>();
    final success = await provider.savePatient(formData, id: widget.patient?.id);

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isEditing
                ? 'Expediente del paciente actualizado correctamente.'
                : 'Paciente registrado exitosamente en el sistema.',
          ),
          backgroundColor: AppTheme.successGreen,
        ),
      );
      Navigator.of(context).pop(true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Ocurrió un error al guardar el paciente.'),
          backgroundColor: AppTheme.errorRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isEditing ? 'Editar Paciente' : 'Registrar Nuevo Paciente',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card info (Kombai var_019946865df7)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.softPurpleChip,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.lightPurpleBg),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.person_add_alt_1_rounded,
                      color: AppTheme.primaryPurple,
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isEditing ? 'Modificación de Ficha Clínica' : 'Nuevo Paciente',
                            style: GoogleFonts.montserrat(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryPurple,
                            ),
                          ),
                          Text(
                            isEditing
                                ? 'Actualizá los datos de contacto u objetivo del paciente.'
                                : 'Completá la información del paciente para habilitar su expediente.',
                            style: GoogleFonts.montserrat(
                              fontSize: 11.5,
                              color: AppTheme.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // DATOS DE IDENTIFICACIÓN
              Text(
                'DATOS DE IDENTIFICACIÓN',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Nombre *'),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _firstNameController,
                          textCapitalization: TextCapitalization.words,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            hintText: 'ej. Sofía',
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Ingresá el nombre';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Apellido *'),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _lastNameController,
                          textCapitalization: TextCapitalization.words,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            hintText: 'ej. Rodríguez',
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Ingresá el apellido';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              _buildLabel('DNI / Nro. Documento'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _dniController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'ej. 41892301',
                  prefixIcon: Icon(Icons.badge_outlined, size: 20),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Fecha de Nacimiento'),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickBirthDate,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                            decoration: BoxDecoration(
                              color: theme.inputDecorationTheme.fillColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.borderLight),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded,
                                    size: 18, color: AppTheme.primaryPurple),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _selectedBirthDate != null
                                        ? '${_selectedBirthDate!.day}/${_selectedBirthDate!.month}/${_selectedBirthDate!.year}'
                                        : 'Seleccionar...',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 13.5,
                                      fontWeight: _selectedBirthDate != null
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                      color: _selectedBirthDate != null
                                          ? theme.colorScheme.onSurface
                                          : AppTheme.textSecondaryLight,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Género'),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedGender,
                          decoration: const InputDecoration(
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'FEMALE', child: Text('Femenino')),
                            DropdownMenuItem(value: 'MALE', child: Text('Masculino')),
                            DropdownMenuItem(value: 'OTHER', child: Text('Otro')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedGender = val;
                              });
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // PACIENTE PEDIÁTRICO (S2 patient-onboarding · C3)
              if (!isEditing) _buildPediatricSection(),

              // DATOS DE CONTACTO
              Text(
                'DATOS DE CONTACTO',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),

              // S2 · C3: si el alta es de un menor, el correo propio del
              // paciente es opcional (la cuenta usa el del representante).
              _buildLabel(_pediatricState.patientEmailRequired
                  ? 'Correo Electrónico'
                  : 'Correo Electrónico (opcional)'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'ejemplo@paciente.com',
                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                ),
                validator: (val) {
                  if (val != null && val.trim().isNotEmpty) {
                    if (!isValidPatientEmail(val)) {
                      return 'Ingresá un correo electrónico válido';
                    }
                  }
                  return null;
                },
              ),
              if (_isPediatric) ...[
                const SizedBox(height: 6),
                Text(
                  'El correo del paciente es opcional: la cuenta y la '
                  'invitación por correo se crean con el correo del '
                  'representante.',
                  style: GoogleFonts.montserrat(
                    fontSize: 11.5,
                    height: 1.3,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
              ],
              const SizedBox(height: 16),

              _buildLabel('Teléfono / WhatsApp'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: '+54 9 11 3456 7890',
                  prefixIcon: Icon(Icons.phone_outlined, size: 20),
                ),
              ),
              const SizedBox(height: 24),

              // OBJETIVO Y ESTADO
              Text(
                'OBJETIVO Y ESTADO CLÍNICO',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),

              _buildLabel('Objetivo Principal Nutricional'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _objectiveController,
                maxLines: 2,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText: 'ej. Descenso de grasa corporal, recomposición muscular...',
                ),
              ),
              const SizedBox(height: 16),

              _buildLabel('Estado de la Ficha'),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedStatus,
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  prefixIcon: Icon(Icons.toggle_on_outlined, size: 22),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'ACTIVE',
                    child: Text('ACTIVO (Paciente en seguimiento)'),
                  ),
                  DropdownMenuItem(
                    value: 'INACTIVE',
                    child: Text('INACTIVO (En pausa o archivado)'),
                  ),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedStatus = val;
                    });
                  }
                },
              ),
              if (!isEditing) ...[
                const SizedBox(height: 24),

                // INVITACIÓN POR CORREO (S1 patient-onboarding · D2c)
                Text(
                  'INVITACIÓN POR CORREO',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 12),

                _buildInvitationOption(),
                const SizedBox(height: 24),

                // AVISO DE PRIVACIDAD (S5 legal-compliance)
                Text(
                  'AVISO DE PRIVACIDAD',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 12),

                _buildPrivacyNoticeAttestation(),
              ],
              const SizedBox(height: 32),

              // Save Button
              ElevatedButton(
                onPressed: _isSaving ? null : _submitForm,
                child: _isSaving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        isEditing ? 'Guardar Cambios' : 'Registrar Paciente',
                        style: GoogleFonts.montserrat(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  /// S2 (patient-onboarding) · C3 — interruptor de paciente pediátrico y
  /// datos del REPRESENTANTE.
  ///
  /// Con el interruptor encendido el alta es de un MENOR: el servidor exige
  /// el bloque `representative` (nombre y correo) y crea la cuenta del
  /// menor a nombre del representante.
  Widget _buildPediatricSection() {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),

        Text(
          'PACIENTE PEDIÁTRICO',
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
            color: theme.colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppTheme.softPurpleChip,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.lightPurpleBg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                key: const Key('patient-pediatric-switch'),
                value: _isPediatric,
                onChanged: _togglePediatric,
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primaryPurple,
                title: Text(
                  'Es paciente pediátrico',
                  style: GoogleFonts.montserrat(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                subtitle: Text(
                  'El paciente es menor de edad: la cuenta y las notificaciones '
                  'se gestionan con los datos de su representante.',
                  style: GoogleFonts.montserrat(
                    fontSize: 11.5,
                    height: 1.35,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
              ),

              if (_isPediatric) ...[
                const SizedBox(height: 8),
                Text(
                  'DATOS DEL REPRESENTANTE',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 12),

                _buildLabel('Nombre del Representante *'),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _representativeNameController,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    hintText: 'ej. María Pérez',
                    prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Ingresá el nombre del representante';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                _buildLabel('Correo del Representante *'),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _representativeEmailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    hintText: 'ej. maria@ejemplo.com',
                    prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Ingresá el correo del representante';
                    }
                    if (!isValidPatientEmail(val)) {
                      return 'Ingresá un correo electrónico válido';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                _buildLabel('Teléfono del Representante'),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _representativePhoneController,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    hintText: 'ej. +58 412 1234567',
                    prefixIcon: Icon(Icons.phone_outlined, size: 20),
                  ),
                ),
                const SizedBox(height: 16),

                _buildLabel('Parentesco'),
                const SizedBox(height: 6),
                DropdownButtonFormField<RepresentativeRelationship>(
                  initialValue: _representativeRelationship,
                  decoration: const InputDecoration(
                    hintText: 'Seleccionar...',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  ),
                  items: RepresentativeRelationship.values
                      .map(
                        (relationship) => DropdownMenuItem(
                          value: relationship,
                          child: Text(relationship.label),
                        ),
                      )
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _representativeRelationship = val;
                      });
                    }
                  },
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// S1 (patient-onboarding) · D2c: el profesional decide si el paciente
  /// recibe la invitación por correo para crear su propia contraseña. Con la
  /// opción activa y sin correo, se avisa (el servidor lo rechazaría con 400)
  /// y no se manda el alta.
  Widget _buildInvitationOption() {
    final state = _invitationState;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.softPurpleChip,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.lightPurpleBg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PatientInvitationCheckbox(
            key: const Key('patient-invitation-checkbox'),
            value: state.checked,
            onChanged: _toggleSendInvitation,
            title: 'Enviar invitación por correo',
            // S2 · C3: con un menor, la invitación la recibe el
            // REPRESENTANTE (es la cuenta del menor).
            subtitle: _isPediatric
                ? 'La invitación se enviará al correo del representante, que es '
                    'quien define la contraseña del menor. El enlace vence a '
                    'las 72 horas.'
                : 'El paciente recibirá un correo con un enlace para crear su '
                    'contraseña. El enlace vence a las 72 horas.',
          ),
          if (state.missingEmail)
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 4),
              child: Text(
                _invitationMissingEmailMessage,
                style: GoogleFonts.montserrat(
                  fontSize: 11.5,
                  height: 1.3,
                  color: AppTheme.errorRed,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// S5 legal-compliance (L13): el registro es presencial y lo documenta el
  /// profesional; el paciente no firma dentro de la app. Mismo sentido que el
  /// checkbox obligatorio del wizard express del portal web.
  Widget _buildPrivacyNoticeAttestation() {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormField<bool>(
          initialValue: false,
          validator: (value) => value == true
              ? null
              : 'Debe confirmarse que el paciente recibió y aceptó el Aviso de Privacidad.',
          builder: (fieldState) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.softPurpleChip,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.lightPurpleBg),
                  ),
                  child: CheckboxListTile(
                    value: fieldState.value ?? false,
                    onChanged: (value) {
                      fieldState.didChange(value ?? false);
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    activeColor: AppTheme.primaryPurple,
                    checkColor: Colors.white,
                    title: Text(
                      'Confirmo que el paciente recibió y aceptó el Aviso de Privacidad (versión vigente) antes de registrar sus datos clínicos.',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        height: 1.35,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
                if (fieldState.hasError)
                  Padding(
                    padding: const EdgeInsets.only(top: 6, left: 4),
                    child: Text(
                      fieldState.errorText!,
                      style: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        color: AppTheme.errorRed,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(height: 4),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _openPrivacyNotice,
            icon: const Icon(
              Icons.open_in_new_rounded,
              size: 16,
              color: AppTheme.primaryPurple,
            ),
            label: Text(
              'Ver Aviso de Privacidad',
              style: GoogleFonts.montserrat(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryPurple,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.montserrat(
        fontSize: 12.5,
        fontWeight: FontWeight.w600,
        color: Theme.of(context).colorScheme.onSurface,
      ),
    );
  }
}
