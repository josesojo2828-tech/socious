import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/app_drawer.dart';

import '../../../../core/widgets/app_header_avatar.dart';

class ComunidadScreen extends StatelessWidget {
  const ComunidadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      drawer: const AppDrawer(currentTabIndex: 3),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'RED & CAPACITACIÓN',
              style: GoogleFonts.montserrat(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: AppTheme.accentPurple,
              ),
            ),
            Text(
              'Comunidad Nutringest',
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
            // Banner Hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.groups_rounded, color: Colors.white, size: 26),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Ecosistema Nutringest',
                              style: GoogleFonts.montserrat(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Conectá con colegas y actualizá tus conocimientos',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Text(
              'MÓDULOS DE COMUNIDAD',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
                color: AppTheme.accentPurple,
              ),
            ),
            const SizedBox(height: 12),

            // Card 1: Red de Nutricionistas
            _buildCommunityCard(
              context,
              title: 'Red Profesional de Nutrición',
              subtitle: 'Foro de discusión, casos clínicos complejos y networking entre colegas',
              icon: Icons.hub_rounded,
              color: const Color(0xFF0284C7),
              badgeText: 'Red',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Accediendo a la Red de Profesionales Nutringest...')),
                );
              },
            ),
            const SizedBox(height: 12),

            // Card 2: Campus Nutringest
            _buildCommunityCard(
              context,
              title: 'Campus & Cursos Online',
              subtitle: 'Capacitaciones continuas en nutrición clínica, deportiva e ISAK',
              icon: Icons.school_rounded,
              color: AppTheme.accentPurple,
              badgeText: 'Campus',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Abriendo Campus Académico Nutringest...')),
                );
              },
            ),
            const SizedBox(height: 12),

            // Card 3: Mercado / Marketplace
            _buildCommunityCard(
              context,
              title: 'Mercado Digital & Recursos',
              subtitle: 'Plantillas de dietas, guías visuales e insumos para consultorios',
              icon: Icons.storefront_rounded,
              color: Colors.orange.shade800,
              badgeText: 'Marketplace',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Explorando Mercado Digital Nutringest...')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommunityCard(
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
