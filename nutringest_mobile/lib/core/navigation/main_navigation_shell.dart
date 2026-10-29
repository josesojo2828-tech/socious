import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../../features/dashboard/presentation/pages/dashboard_screen.dart';
import '../../features/gestion/presentation/pages/gestion_screen.dart';
import '../../features/nutrition/presentation/pages/nutricion_screen.dart';
import '../../features/community/presentation/pages/comunidad_screen.dart';
import '../../features/auth/pages/profile_page.dart';
import 'app_drawer.dart';

/// Scope to allow nested widgets and drawers to switch tabs on the shell smoothly.
class MainNavigationShellScope extends InheritedWidget {
  final ValueChanged<int> onSelectTab;

  const MainNavigationShellScope({
    super.key,
    required this.onSelectTab,
    required super.child,
  });

  static MainNavigationShellScope? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<MainNavigationShellScope>();
  }

  static MainNavigationShellScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<MainNavigationShellScope>();
  }

  void selectTab(int index) => onSelectTab(index);

  @override
  bool updateShouldNotify(MainNavigationShellScope oldWidget) => false;
}

/// Shell de Navegación Principal de Nutringest Mobile con 5 Tabs (Material 3 Icon-Only Homogéneo)
class MainNavigationShell extends StatefulWidget {
  final int initialIndex;

  const MainNavigationShell({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onSelectTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final List<Widget> pages = [
      const DashboardScreen(),
      const GestionScreen(),
      const NutricionScreen(),
      const ComunidadScreen(),
      const ProfilePage(),
    ];

    return Scaffold(
      drawer: AppDrawer(
        currentTabIndex: _currentIndex,
        onSelectTab: _onSelectTab,
      ),
      body: MainNavigationShellScope(
        onSelectTab: _onSelectTab,
        child: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        height: 64,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        indicatorColor: isDark
            ? AppTheme.primaryPurple.withValues(alpha: 0.35)
            : AppTheme.lightPurpleBg,
        elevation: 8,
        backgroundColor: isDark ? AppTheme.cardDark : AppTheme.cardLight,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard_rounded, color: AppTheme.primaryPurple),
            label: 'Dashboard',
            tooltip: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon: Icon(Icons.people_rounded, color: AppTheme.primaryPurple),
            label: 'Gestión Clínica',
            tooltip: 'Gestión Clínica',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu_rounded, color: AppTheme.primaryPurple),
            label: 'Herramientas Nutricionales',
            tooltip: 'Herramientas Nutricionales',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups_rounded, color: AppTheme.primaryPurple),
            label: 'Comunidad & Red',
            tooltip: 'Comunidad & Red',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded, color: AppTheme.primaryPurple),
            label: 'Perfil & Ajustes',
            tooltip: 'Perfil & Ajustes',
          ),
        ],
      ),
    );
  }
}
