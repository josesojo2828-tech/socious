import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../navigation/main_navigation_shell.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/pages/profile_page.dart';

class AppHeaderAvatar extends StatelessWidget {
  final double size;

  const AppHeaderAvatar({super.key, this.size = 36});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final initials = user?.initials ?? 'N';
    final avatarUrl = user?.avatarUrl;

    Widget avatarContent;
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        avatarContent = Image.network(
          avatarUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _buildInitials(initials),
        );
      } else {
        avatarContent = Image.file(
          File(avatarUrl),
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _buildInitials(initials),
        );
      }
    } else {
      avatarContent = _buildInitials(initials);
    }

    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: GestureDetector(
        onTap: () {
          final shellScope = MainNavigationShellScope.maybeOf(context);
          if (shellScope != null) {
            shellScope.selectTab(4);
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            );
          }
        },
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppTheme.accentPurple, width: 1.5),
            gradient: const LinearGradient(
              colors: [AppTheme.primaryPurple, AppTheme.accentPurple],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: ClipOval(child: avatarContent),
        ),
      ),
    );
  }

  Widget _buildInitials(String initials) {
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.montserrat(
          color: Colors.white,
          fontSize: size * 0.4,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
