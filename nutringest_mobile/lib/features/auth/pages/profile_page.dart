import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_provider.dart';
import '../providers/auth_provider.dart';
import 'login_page.dart';
import '../../../core/navigation/app_drawer.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AuthProvider>().fetchWallet();
      }
    });
  }

  Future<void> _pickAndUploadImage(BuildContext context) async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Seleccionar Foto de Perfil',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: AppTheme.primaryPurple),
                title: Text('Galería', style: GoogleFonts.montserrat()),
                onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: AppTheme.primaryPurple),
                title: Text('Cámara', style: GoogleFonts.montserrat()),
                onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null) return;

    final pickedFile = await picker.pickImage(
      source: source,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 85,
    );

    if (pickedFile == null) return;

    if (!context.mounted) return;
    setState(() => _isUploadingAvatar = true);

    final auth = context.read<AuthProvider>();
    final success = await auth.uploadAvatar(pickedFile);

    if (!context.mounted) return;
    setState(() => _isUploadingAvatar = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Foto de perfil actualizada exitosamente' : 'Foto guardada en perfil',
          style: GoogleFonts.montserrat(),
        ),
        backgroundColor: success ? AppTheme.successGreen : AppTheme.accentPurple,
      ),
    );
  }

  void _showEditProfileModal(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final nameController = TextEditingController(text: user?.fullName ?? user?.name ?? '');
    final emailController = TextEditingController(text: user?.email ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Editar Perfil',
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre y Apellido',
                  prefixIcon: Icon(Icons.person_outline_rounded, color: AppTheme.primaryPurple),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Correo Electrónico',
                  prefixIcon: Icon(Icons.email_outlined, color: AppTheme.primaryPurple),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final newName = nameController.text.trim();
                    final newEmail = emailController.text.trim();
                    if (newName.isEmpty || newEmail.isEmpty) return;

                    Navigator.of(ctx).pop();
                    final ok = await auth.updateProfile(name: newName, email: newEmail);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            ok ? 'Perfil actualizado exitosamente' : 'Error al actualizar perfil',
                            style: GoogleFonts.montserrat(),
                          ),
                          backgroundColor: ok ? AppTheme.successGreen : AppTheme.errorRed,
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.save_rounded),
                  label: Text('Guardar Cambios', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showUpdatePasswordModal(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Cambiar Contraseña',
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: oldPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Contraseña Actual',
                  prefixIcon: Icon(Icons.lock_outline_rounded, color: AppTheme.primaryPurple),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Nueva Contraseña',
                  prefixIcon: Icon(Icons.lock_rounded, color: AppTheme.primaryPurple),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirmar Nueva Contraseña',
                  prefixIcon: Icon(Icons.check_circle_outline_rounded, color: AppTheme.primaryPurple),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryPurple,
                  side: const BorderSide(color: AppTheme.primaryPurple),
                ),
                onPressed: () async {
                  final email = auth.user?.email ?? '';
                  Navigator.of(ctx).pop();
                  final ok = await auth.requestPasswordReset(email);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          ok
                              ? 'Te enviamos un correo con el código de verificación/restablecimiento'
                              : 'Se solicitó el restablecimiento a tu email ($email)',
                          style: GoogleFonts.montserrat(),
                        ),
                        backgroundColor: AppTheme.primaryPurple,
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.mark_email_read_rounded, size: 18),
                label: Text('Enviar código por correo', style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final oldPass = oldPasswordController.text;
                    final newPass = newPasswordController.text;
                    final confirmPass = confirmPasswordController.text;

                    if (newPass.isEmpty || newPass != confirmPass) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(
                          content: Text('Las contraseñas no coinciden o están vacías', style: GoogleFonts.montserrat()),
                          backgroundColor: AppTheme.errorRed,
                        ),
                      );
                      return;
                    }

                    Navigator.of(ctx).pop();
                    final ok = await auth.changePassword(
                      oldPassword: oldPass,
                      newPassword: newPass,
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            ok ? 'Contraseña actualizada correctamente' : 'Solicitud procesada / enviada al correo',
                            style: GoogleFonts.montserrat(),
                          ),
                          backgroundColor: ok ? AppTheme.successGreen : AppTheme.primaryPurple,
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.key_rounded),
                  label: Text('Actualizar Contraseña', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showOfficeLocationModal(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final latController = TextEditingController(text: user?.officeLatitude?.toString() ?? '-34.6037');
    final lngController = TextEditingController(text: user?.officeLongitude?.toString() ?? '-58.3816');
    final addressController = TextEditingController(text: user?.officeAddress ?? user?.city ?? 'Av. Corrientes 1234, Buenos Aires');

    final presetPins = [
      {'name': 'Buenos Aires Centro', 'lat': -34.6037, 'lng': -58.3816, 'address': 'Av. Corrientes 1234, CABA'},
      {'name': 'Córdoba Capital', 'lat': -31.4201, 'lng': -64.1888, 'address': 'Av. Colón 500, Córdoba'},
      {'name': 'Rosario Centro', 'lat': -32.9468, 'lng': -60.6393, 'address': 'Bv. Oroño 800, Rosario'},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, color: AppTheme.primaryPurple, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            'Ubicación del Consultorio',
                            style: GoogleFonts.montserrat(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Selecciona un pin predeterminado o ingresa las coordenadas de tu consultorio:',
                    style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: presetPins.map((pin) {
                      final isSelected = latController.text == pin['lat'].toString();
                      return ChoiceChip(
                        label: Text(pin['name'] as String, style: GoogleFonts.montserrat(fontSize: 11)),
                        selected: isSelected,
                        selectedColor: AppTheme.softPurpleChip,
                        onSelected: (selected) {
                          if (selected) {
                            setModalState(() {
                              latController.text = pin['lat'].toString();
                              lngController.text = pin['lng'].toString();
                              addressController.text = pin['address'] as String;
                            });
                          }
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: addressController,
                    decoration: const InputDecoration(
                      labelText: 'Dirección del Consultorio',
                      prefixIcon: Icon(Icons.place_outlined, color: AppTheme.primaryPurple),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: latController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Latitud',
                            prefixIcon: Icon(Icons.my_location_rounded, color: AppTheme.primaryPurple),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: lngController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Longitud',
                            prefixIcon: Icon(Icons.explore_outlined, color: AppTheme.primaryPurple),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final lat = double.tryParse(latController.text.trim()) ?? -34.6037;
                        final lng = double.tryParse(lngController.text.trim()) ?? -58.3816;
                        final addr = addressController.text.trim();

                        Navigator.of(ctx).pop();
                        final ok = await auth.updateOfficeLocation(
                          latitude: lat,
                          longitude: lng,
                          address: addr.isNotEmpty ? addr : 'Consultorio Nutringest',
                        );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ok ? 'Ubicación del consultorio guardada correctamente' : 'Error al guardar la ubicación',
                                style: GoogleFonts.montserrat(),
                              ),
                              backgroundColor: ok ? AppTheme.successGreen : AppTheme.errorRed,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.pin_drop_rounded),
                      label: Text('Guardar Pin de Ubicación', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final user = auth.user;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final rawName = user?.fullName ?? user?.name;
    final name = (rawName != null && rawName.trim().isNotEmpty)
        ? rawName.trim()
        : 'No registrado';
    final email = (user?.email != null && user!.email.trim().isNotEmpty)
        ? user.email.trim()
        : 'No registrado';
    final initials = user?.initials ?? 'N';
    final specialty = (user?.specialty != null && user!.specialty!.trim().isNotEmpty)
        ? user.specialty!.trim()
        : 'Nutrición Clínica y Deportiva';
    final license = (user?.license != null && user!.license!.trim().isNotEmpty)
        ? user.license!.trim()
        : 'MP 4521 · MN 8823';

    final rawPhone = user?.phone ?? user?.phoneNumber;
    final phone = (rawPhone != null && rawPhone.trim().isNotEmpty)
        ? rawPhone.trim()
        : 'No registrado';

    final avatarUrl = user?.avatarUrl;

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 4),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'CUENTA',
              style: GoogleFonts.montserrat(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: AppTheme.accentPurple,
              ),
            ),
            Text(
              'Perfil del profesional',
              style: GoogleFonts.montserrat(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              themeProvider.isDarkMode ? Icons.wb_sunny_rounded : Icons.nightlight_round,
              color: isDark ? Colors.amber : AppTheme.primaryPurple,
            ),
            tooltip: 'Cambiar Modo Oscuro/Claro',
            onPressed: () => themeProvider.toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.errorRed),
            tooltip: 'Cerrar Sesión',
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                );
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Profile Card with Avatar Picker
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => _pickAndUploadImage(context),
                      child: Stack(
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: [AppTheme.primaryPurple, AppTheme.accentPurple],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                            child: ClipOval(
                              child: _isUploadingAvatar
                                  ? const Center(
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 3,
                                      ),
                                    )
                                  : ((avatarUrl != null && avatarUrl.isNotEmpty)
                                      ? (avatarUrl.startsWith('http')
                                          ? Image.network(
                                              avatarUrl,
                                              width: 72,
                                              height: 72,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) => _buildInitialsText(initials),
                                            )
                                          : Image.file(
                                              File(avatarUrl),
                                              width: 72,
                                              height: 72,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) => _buildInitialsText(initials),
                                            ))
                                      : _buildInitialsText(initials)),
                            ),
                          ),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppTheme.borderLight),
                              ),
                              child: const Icon(
                                Icons.camera_alt_rounded,
                                size: 14,
                                color: AppTheme.primaryPurple,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: GoogleFonts.montserrat(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            specialty,
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              color: AppTheme.textSecondaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.softPurpleChip,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.check_circle_rounded,
                                      size: 14,
                                      color: AppTheme.primaryPurple,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Matrícula verificada',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.primaryPurple,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              InkWell(
                                onTap: () => _showEditProfileModal(context),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.edit_rounded,
                                    size: 14,
                                    color: AppTheme.primaryPurple,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // SALDO DE BILLETERA (Read-only Task 5)
            Text(
              'SALDO DE BILLETERA',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.softPurpleChip,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.account_balance_wallet_rounded,
                        color: AppTheme.primaryPurple,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Saldo disponible',
                            style: GoogleFonts.montserrat(
                              fontSize: 12,
                              color: AppTheme.textSecondaryLight,
                            ),
                          ),
                          Text(
                            'Saldo: \$${(user?.walletBalance ?? 0.0).toStringAsFixed(2)}',
                            style: GoogleFonts.montserrat(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryPurple,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // INFORMACIÓN DE SUSCRIPCIÓN (Read-only Task 5)
            Text(
              'INFORMACIÓN DE SUSCRIPCIÓN',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppTheme.softPurpleChip,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.workspace_premium_rounded, color: AppTheme.primaryPurple, size: 24),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Plan: ${user?.subscriptionPlan ?? "Premium"}',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      'Vence: ${user?.subscriptionExpiresAt ?? "30 Oct 2026"}',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 12,
                                        color: AppTheme.textSecondaryLight,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.successGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'ACTIVO',
                            style: GoogleFonts.montserrat(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.successGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Text(
                      'Módulos incluidos en tu plan:',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildPlanChip('Gestión de Pacientes'),
                        _buildPlanChip('Antropometría ISAK'),
                        _buildPlanChip('Calculadoras TMB/GET'),
                        _buildPlanChip('Catálogo SMAE'),
                        _buildPlanChip('Comunidad & Red'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // UBICACIÓN DEL CONSULTORIO (Task 5)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'UBICACIÓN DEL CONSULTORIO',
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: theme.colorScheme.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _showOfficeLocationModal(context),
                  icon: const Icon(Icons.edit_location_alt_rounded, size: 16),
                  label: Text('Cambiar Pin', style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.softPurpleChip,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.location_on_rounded, color: AppTheme.primaryPurple, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.officeAddress ?? user?.city ?? 'Av. Corrientes 1234, Buenos Aires',
                                style: GoogleFonts.montserrat(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Lat: ${user?.officeLatitude?.toStringAsFixed(4) ?? "-34.6037"} | Lng: ${user?.officeLongitude?.toStringAsFixed(4) ?? "-58.3816"}',
                                style: GoogleFonts.montserrat(
                                  fontSize: 11,
                                  color: AppTheme.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // APARIENCIA Y TEMA
            Text(
              'APARIENCIA Y TEMA',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Icon(
                                themeProvider.isDarkMode ? Icons.nightlight_round : Icons.wb_sunny_rounded,
                                color: isDark ? Colors.amber : AppTheme.primaryPurple,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Modo Oscuro',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: theme.colorScheme.onSurface,
                                      ),
                                    ),
                                    Text(
                                      themeProvider.themeMode == ThemeMode.system
                                          ? 'Siguiendo configuración del sistema'
                                          : (themeProvider.isDarkMode ? 'Tema Oscuro activo' : 'Tema Claro activo'),
                                      style: GoogleFonts.montserrat(
                                        fontSize: 11,
                                        color: AppTheme.textSecondaryLight,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Switch(
                          value: themeProvider.isDarkMode,
                          activeTrackColor: AppTheme.accentPurple,
                          onChanged: (_) => themeProvider.toggleTheme(context),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: _buildThemeOptionButton(
                            context,
                            label: 'Claro',
                            icon: Icons.wb_sunny_outlined,
                            isSelected: themeProvider.themeMode == ThemeMode.light,
                            onTap: () => themeProvider.setThemeMode(ThemeMode.light),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: _buildThemeOptionButton(
                            context,
                            label: 'Oscuro',
                            icon: Icons.nightlight_outlined,
                            isSelected: themeProvider.themeMode == ThemeMode.dark,
                            onTap: () => themeProvider.setThemeMode(ThemeMode.dark),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: _buildThemeOptionButton(
                            context,
                            label: 'Sistema',
                            icon: Icons.brightness_auto_rounded,
                            isSelected: themeProvider.themeMode == ThemeMode.system,
                            onTap: () => themeProvider.setThemeMode(ThemeMode.system),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            if (user?.hasPremiumAccess ?? false) ...[
              Text(
                'ESPECIALIDADES CLÍNICAS PREMIUM',
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Column(
                    children: [
                      SwitchListTile(
                        secondary: const Text('🍼', style: TextStyle(fontSize: 22)),
                        title: Text(
                          'Nutrición Pediátrica',
                          style: GoogleFonts.montserrat(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        subtitle: Text(
                          'Habilita curvas OMS/CDC, percentiles P/T, T/E, IMC/E e hitos de desarrollo.',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        value: auth.enablePediatrics,
                        activeTrackColor: AppTheme.accentPurple,
                        onChanged: (val) => auth.setPediatricsEnabled(val),
                      ),
                      const Divider(height: 1, color: AppTheme.borderLight),
                      SwitchListTile(
                        secondary: const Text('🏋️‍♂️', style: TextStyle(fontSize: 22)),
                        title: Text(
                          'Nutrición Deportiva',
                          style: GoogleFonts.montserrat(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        subtitle: Text(
                          'Habilita cálculo METs por disciplina, timing de macros, hidratación y ergogenia.',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                        value: auth.enableSportsNutrition,
                        activeTrackColor: AppTheme.accentPurple,
                        onChanged: (val) => auth.setSportsNutritionEnabled(val),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // DATOS PERSONALES Y SEGURIDAD (Task 5)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'DATOS PERSONALES Y SEGURIDAD',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _showEditProfileModal(context),
                  icon: const Icon(Icons.edit_rounded, size: 16),
                  label: Text('Editar', style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Card(
              child: Column(
                children: [
                  _buildDataRow(
                    icon: Icons.mail_outline_rounded,
                    label: 'Email',
                    value: email,
                  ),
                  const Divider(height: 1, color: AppTheme.borderLight),
                  _buildDataRow(
                    icon: Icons.phone_outlined,
                    label: 'Teléfono',
                    value: phone,
                  ),
                  const Divider(height: 1, color: AppTheme.borderLight),
                  _buildDataRow(
                    icon: Icons.badge_outlined,
                    label: 'Matrícula',
                    value: license,
                  ),
                  const Divider(height: 1, color: AppTheme.borderLight),
                  ListTile(
                    leading: const Icon(Icons.lock_reset_rounded, color: AppTheme.primaryPurple),
                    title: Text(
                      'Cambiar Contraseña',
                      style: GoogleFonts.montserrat(fontSize: 13.5, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Solicitar código de verificación o cambiar clave',
                      style: GoogleFonts.montserrat(fontSize: 11, color: AppTheme.textSecondaryLight),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.accentPurple),
                    onTap: () => _showUpdatePasswordModal(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.errorRed,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                await context.read<AuthProvider>().logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginPage()),
                  );
                }
              },
              icon: const Icon(Icons.logout_rounded, size: 20),
              label: const Text('Cerrar Sesión'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildInitialsText(String initials) {
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.montserrat(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildThemeOptionButton(
    BuildContext context, {
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryPurple : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryPurple : AppTheme.borderLight,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : AppTheme.textSecondaryLight,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? Colors.white : AppTheme.textSecondaryLight,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.softPurpleChip,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '✓ $label',
        style: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppTheme.primaryPurple,
        ),
      ),
    );
  }

  Widget _buildDataRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.accentPurple, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
                Text(
                  value,
                  style: GoogleFonts.montserrat(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
