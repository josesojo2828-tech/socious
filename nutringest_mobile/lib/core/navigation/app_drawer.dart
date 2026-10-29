import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../theme/theme_provider.dart';
import '../widgets/nutringest_logo.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/dashboard/providers/sidebar_provider.dart';
import '../../features/patients/presentation/pages/patient_list_page.dart';
import '../../features/agenda/presentation/pages/agenda_calendar_screen.dart';
import '../../features/nutrition/presentation/pages/menu_list_page.dart';
import '../../features/nutrition/presentation/pages/exchange_foods_page.dart';
import '../../features/nutrition/presentation/pages/food_catalog_page.dart';
import '../../features/nutrition/presentation/pages/condiments_page.dart';
import '../../features/nutrition/presentation/pages/institutional_food_page.dart';
import '../../features/community/presentation/pages/comunidad_screen.dart';
import 'main_navigation_shell.dart';

/// AppDrawer: Menú lateral alineado 1:1 con la versión web, consumiendo SidebarProvider
/// y renderizando las 5 secciones estructuradas del backend (GET /api/dashboard/sidebar).
class AppDrawer extends StatefulWidget {
  final int? currentTabIndex;
  final String? activeLink;
  final ValueChanged<int>? onSelectTab;

  const AppDrawer({
    super.key,
    this.currentTabIndex,
    this.activeLink,
    this.onSelectTab,
  });

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final sidebarProvider = context.read<SidebarProvider>();
      if (!sidebarProvider.hasFetched && !sidebarProvider.isLoading) {
        sidebarProvider.fetchSidebar();
      }
    });
  }

  void _navigateToTab(BuildContext context, int tabIndex) {
    Navigator.of(context).pop(); // Close drawer
    final onTab = widget.onSelectTab ?? MainNavigationShellScope.maybeOf(context)?.onSelectTab;
    if (onTab != null) {
      onTab(tabIndex);
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } else {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => MainNavigationShell(initialIndex: tabIndex)),
        (route) => false,
      );
    }
  }

  void _navigateToPage(BuildContext context, Widget page) {
    Navigator.of(context).pop(); // Close drawer
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => page),
    );
  }

  void _handleItemTap(BuildContext context, SidebarItemModel item) {
    final link = item.link.toLowerCase().replaceAll(RegExp(r'/+$'), '');

    if (link == '/dashboard' || link.isEmpty) {
      _navigateToTab(context, 0);
    } else if (link.contains('/patients')) {
      _navigateToPage(context, const PatientListPage());
    } else if (link.contains('/diets') || link.contains('/agenda') || item.title.contains('consultations')) {
      _navigateToPage(context, const AgendaCalendarScreen());
    } else if (link.contains('/menu')) {
      _navigateToPage(context, const MenuListPage());
    } else if (link.contains('/exchange-list')) {
      _navigateToPage(context, const ExchangeFoodsPage());
    } else if (link.contains('/exchange-food')) {
      _navigateToPage(context, const ExchangeFoodsPage());
    } else if (link.contains('/foods') || link.contains('/food')) {
      _navigateToPage(context, const FoodCatalogPage());
    } else if (link.contains('/condiments') || link.contains('/condiment')) {
      _navigateToPage(context, const CondimentsPage());
    } else if (link.contains('/institutional')) {
      _navigateToPage(context, const InstitutionalFoodPage());
    } else if (link.contains('/community')) {
      _navigateToPage(context, const ComunidadScreen());
    } else if (link.contains('/portfolio')) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Portafolio Profesional disponible en la versión Web.',
            style: GoogleFonts.montserrat(fontSize: 13),
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    } else if (link.contains('/campus') || link.contains('/marketplace')) {
      _navigateToPage(context, const ComunidadScreen());
    } else {
      _navigateToTab(context, 0);
    }
  }

  bool _isItemActive(SidebarItemModel item) {
    final link = item.link.toLowerCase().replaceAll(RegExp(r'/+$'), '');
    if (widget.activeLink != null) {
      final active = widget.activeLink!.toLowerCase().replaceAll(RegExp(r'/+$'), '');
      return link == active || link.endsWith(active);
    }
    if (widget.currentTabIndex != null) {
      if (widget.currentTabIndex == 0 && (link == '/dashboard' || link.isEmpty)) {
        return true;
      }
      if (widget.currentTabIndex == 3 && link == '/dashboard/community') {
        return true;
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final sidebarProvider = context.watch<SidebarProvider>();
    final user = auth.user;

    final userName = user?.name ?? 'Lic. Marina Gutiérrez';
    final userSpecialty = user?.specialty ?? 'Nutrición Clínica y Deportiva';
    final userInitials = user?.initials ?? 'MG';

    final sections = sidebarProvider.sections;

    return Drawer(
      backgroundColor: isDark ? AppTheme.bgDark : AppTheme.cardLight,
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header with NutringestLogo & Theme Toggle Switch
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryPurple, AppTheme.accentPurple],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const NutringestLogo(
                              width: 34,
                              height: 34,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Nutringest',
                                    style: GoogleFonts.montserrat(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: -0.5,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    'Mobile Arch v1.0',
                                    style: GoogleFonts.montserrat(
                                      color: Colors.white.withValues(alpha: 0.8),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
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

                      // Theme Switch Button (Sun / Moon)
                      IconButton(
                        icon: Icon(
                          themeProvider.isDarkMode ? Icons.wb_sunny_rounded : Icons.nightlight_round,
                          color: Colors.white,
                        ),
                        tooltip: 'Alternar Tema Claro/Oscuro',
                        onPressed: () => themeProvider.toggleTheme(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  InkWell(
                    onTap: () => _navigateToTab(context, 4),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.25),
                              border: Border.all(color: Colors.white, width: 1.5),
                            ),
                            child: ClipOval(
                              child: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                                  ? (user.avatarUrl!.startsWith('http')
                                      ? Image.network(
                                          user.avatarUrl!,
                                          width: 40,
                                          height: 40,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) => Center(
                                            child: Text(
                                              userInitials,
                                              style: GoogleFonts.montserrat(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                              ),
                                            ),
                                          ),
                                        )
                                      : Image.file(
                                          File(user.avatarUrl!),
                                          width: 40,
                                          height: 40,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) => Center(
                                            child: Text(
                                              userInitials,
                                              style: GoogleFonts.montserrat(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                              ),
                                            ),
                                          ),
                                        ))
                                  : Center(
                                      child: Text(
                                        userInitials,
                                        style: GoogleFonts.montserrat(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  userName,
                                  style: GoogleFonts.montserrat(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  userSpecialty,
                                  style: GoogleFonts.montserrat(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 11,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable Navigation List (5 sections from SidebarProvider)
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  for (int i = 0; i < sections.length; i++) ...[
                    _buildGroupHeader(sections[i].displayTitle, isDark),
                    for (final item in sections[i].items)
                      _buildDrawerItem(
                        context: context,
                        item: item,
                        isDark: isDark,
                      ),
                    if (i < sections.length - 1)
                      Divider(
                        height: 18,
                        indent: 16,
                        endIndent: 16,
                        thickness: 0.5,
                        color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                      ),
                  ],
                ],
              ),
            ),

            // Logout Action Footer
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                  ),
                ),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                leading: const Icon(Icons.logout_rounded, color: AppTheme.errorRed),
                title: Text(
                  'Cerrar Sesión',
                  style: GoogleFonts.montserrat(
                    color: AppTheme.errorRed,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                onTap: () async {
                  Navigator.of(context).pop();
                  await auth.logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginPage()),
                      (route) => false,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGroupHeader(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 18, right: 18, top: 14, bottom: 4),
      child: Text(
        title,
        style: GoogleFonts.montserrat(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
          color: isDark
              ? Colors.white.withValues(alpha: 0.45)
              : AppTheme.textSecondaryLight.withValues(alpha: 0.8),
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required BuildContext context,
    required SidebarItemModel item,
    required bool isDark,
  }) {
    final isSelected = _isItemActive(item);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected
            ? (isDark
                ? AppTheme.primaryPurple.withValues(alpha: 0.25)
                : AppTheme.lightPurpleBg)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: isSelected
            ? Border.all(
                color: isDark
                    ? AppTheme.accentPurple.withValues(alpha: 0.5)
                    : AppTheme.primaryPurple.withValues(alpha: 0.2),
                width: 1,
              )
            : null,
      ),
      child: ListTile(
        dense: true,
        visualDensity: const VisualDensity(horizontal: 0, vertical: -2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Icon(
          item.iconData,
          color: isSelected
              ? AppTheme.primaryPurple
              : (isDark
                  ? Colors.white.withValues(alpha: 0.75)
                  : AppTheme.textSecondaryLight),
          size: 20,
        ),
        title: Text(
          item.displayTitle,
          style: GoogleFonts.montserrat(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected
                ? AppTheme.primaryPurple
                : (isDark ? Colors.white : AppTheme.textPrimaryLight),
          ),
        ),
        trailing: isSelected
            ? Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: AppTheme.primaryPurple,
                  shape: BoxShape.circle,
                ),
              )
            : Icon(
                Icons.chevron_right_rounded,
                size: 16,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.2)
                    : AppTheme.borderLight,
              ),
        onTap: () => _handleItemTap(context, item),
      ),
    );
  }
}
