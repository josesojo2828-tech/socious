import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/app_drawer.dart';
import '../../../auth/providers/auth_provider.dart';
import 'food_catalog_page.dart';
import 'exchange_foods_page.dart';
import 'exchange_list_page.dart';
import 'condiments_page.dart';
import 'institutional_food_page.dart';
import 'menu_list_page.dart';

import '../../../../core/widgets/app_header_avatar.dart';

class NutricionScreen extends StatefulWidget {
  const NutricionScreen({super.key});

  @override
  State<NutricionScreen> createState() => _NutricionScreenState();
}

class _NutricionScreenState extends State<NutricionScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }


  void _handleInstitutionalFoodTap(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final hasAccess = user != null &&
        (user.hasInstitutionalFoodAccess ||
            user.hasPremiumAccess ||
            user.isAdmin ||
            user.hasEntitlement('INSTITUTIONAL_FOOD') ||
            user.hasPermission('INSTITUTIONAL_FOOD') ||
            auth.hasInstitutionalFoodAccess);

    if (hasAccess) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const InstitutionalFoodPage()),
      );
    } else {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.lock_rounded, color: AppTheme.accentPurple, size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Acceso Restringido',
                  style: GoogleFonts.montserrat(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          content: Text(
            'El módulo de Alimentación Colectiva (Menús masivos e institucionales) requiere permisos de usuario INSTITUTIONAL_FOOD o una suscripción Premium activa.',
            style: GoogleFonts.montserrat(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(
                'Entendido',
                style: GoogleFonts.montserrat(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryPurple,
                ),
              ),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Definition of the 6 Nutrición & Planificación sub-modules
    final subModules = [
      _SubModuleItem(
        title: 'Menús',
        subtitle: 'Plantillas de menús y dietas reutilizables',
        icon: Icons.restaurant_menu_rounded,
        color: AppTheme.accentPurple,
        badgeText: 'Menús & Dietas',
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const MenuListPage(),
            ),
          );
        },
      ),
      _SubModuleItem(
        title: 'Lista de Intercambio',
        subtitle: 'Sistema de listas por grupos de alimentos y raciones',
        icon: Icons.format_list_bulleted_rounded,
        color: Colors.teal,
        badgeText: 'Listas',
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const ExchangeListPage(),
            ),
          );
        },
      ),
      _SubModuleItem(
        title: 'Todos los Alimentos',
        subtitle: 'Catálogo completo SMAE / Base de datos',
        icon: Icons.apple_rounded,
        color: AppTheme.primaryPurple,
        badgeText: 'Base SMAE',
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const FoodCatalogPage()),
          );
        },
      ),
      _SubModuleItem(
        title: 'Alimentos de Intercambio',
        subtitle: 'Clasificación por equivalentes de intercambio',
        icon: Icons.swap_horiz_rounded,
        color: const Color(0xFF0984E3),
        badgeText: 'Equivalentes',
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ExchangeFoodsPage()),
          );
        },
      ),
      _SubModuleItem(
        title: 'Condimentos',
        subtitle: 'Especias, libre consumo y condimentos',
        icon: Icons.grain_rounded,
        color: const Color(0xFF6C5CE7),
        badgeText: 'Libre Consumo',
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CondimentsPage()),
          );
        },
      ),
      _SubModuleItem(
        title: 'Alimentación Colectiva',
        subtitle: 'Menús masivos e institucionales',
        icon: Icons.corporate_fare_rounded,
        color: const Color(0xFFD63031),
        badgeText: 'Institucional',
        onTap: () => _handleInstitutionalFoodTap(context),
      ),
    ];

    // Filter sub-modules by search query
    final filteredModules = subModules.where((mod) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return mod.title.toLowerCase().contains(q) ||
          mod.subtitle.toLowerCase().contains(q) ||
          mod.badgeText.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 2),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'HERRAMIENTAS NUTRICIONALES',
              style: GoogleFonts.montserrat(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: AppTheme.accentPurple,
              ),
            ),
            Text(
              'Nutrición & Planificación',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
        actions: const [
          AppHeaderAvatar(),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Search Bar
            TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Buscar sub-módulo o herramienta...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.primaryPurple),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.borderLight),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Section Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'SUB-MÓDULOS DE NUTRICIÓN',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: AppTheme.accentPurple,
                  ),
                ),
                Text(
                  '${filteredModules.length} / ${subModules.length}',
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // List of Sub-Module Cards
            if (filteredModules.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32.0),
                child: Center(
                  child: Text(
                    'No se encontraron sub-módulos que coincidan con "$_searchQuery".',
                    style: GoogleFonts.montserrat(
                      fontSize: 13,
                      color: AppTheme.textSecondaryLight,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else
              ...filteredModules.map((module) => Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: _buildNutritionCard(
                      context,
                      title: module.title,
                      subtitle: module.subtitle,
                      icon: module.icon,
                      color: module.color,
                      badgeText: module.badgeText,
                      onTap: module.onTap,
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildNutritionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String badgeText,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.montserrat(
                              fontSize: 14.5,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              badgeText,
                              style: GoogleFonts.montserrat(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: color,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        color: AppTheme.textSecondaryLight,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondaryLight),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubModuleItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final String badgeText;
  final VoidCallback onTap;

  _SubModuleItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.badgeText,
    required this.onTap,
  });
}
