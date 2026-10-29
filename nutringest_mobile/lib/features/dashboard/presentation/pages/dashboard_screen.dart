import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/theme_provider.dart';
import '../../../../core/navigation/app_drawer.dart';
import '../../../../core/widgets/nutringest_logo.dart';
import '../../../../core/widgets/app_header_avatar.dart';
import '../../../calculators/presentation/pages/calculators_tab_container_page.dart';
import '../../../calculators/providers/calculators_provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = context.watch<ThemeProvider>();

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 0),
      appBar: AppBar(
        title: Row(
          children: [
            const NutringestLogo(width: 28, height: 28),
            const SizedBox(width: 10),
            Text(
              'Dashboard',
              style: GoogleFonts.montserrat(
                fontSize: 18,
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
          const AppHeaderAvatar(),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                    width: 1,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryPurple.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.dashboard_outlined,
                        size: 48,
                        color: AppTheme.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Panel Principal',
                      style: GoogleFonts.montserrat(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Vista limpia y minimalista',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        color: isDark ? AppTheme.textSecondaryDark : AppTheme.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'ACCESOS RÁPIDOS',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: AppTheme.accentPurple,
                ),
              ),
              const SizedBox(height: 12),
              Card(
                elevation: 0,
                color: isDark ? AppTheme.cardDark : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                  ),
                ),
                child: InkWell(
                  onTap: () {
                    context.read<CalculatorsProvider>().resetEnergyParams();
                    context.read<CalculatorsProvider>().resetWasteParams();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const CalculatorsTabContainerPage(),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.calculate_rounded,
                            color: AppTheme.primaryPurple,
                            size: 26,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Calculadora Nutricional',
                                style: GoogleFonts.montserrat(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: theme.colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'TMB, Gasto Energético Total (GET) y Mermas',
                                style: GoogleFonts.montserrat(
                                  fontSize: 12,
                                  color: isDark ? AppTheme.textSecondaryDark : AppTheme.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: AppTheme.textSecondaryLight,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
