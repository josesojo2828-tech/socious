import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../core/navigation/main_navigation_shell.dart';
import '../../../core/storage/auth_storage.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/nutringest_logo.dart';
import '../providers/auth_provider.dart';
import 'login_page.dart';

class OnboardingSlide {
  final String emoji;
  final String badge;
  final String title;
  final String subtitle;
  final IconData icon;
  final List<String> tags;
  final List<Color> gradientColors;

  const OnboardingSlide({
    required this.emoji,
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.tags,
    required this.gradientColors,
  });
}

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const List<OnboardingSlide> _slides = [
    OnboardingSlide(
      emoji: '🥗',
      badge: 'EVALUACIÓN CLÍNICA 360°',
      title: 'Nutrición Inteligente & Evaluación Clínica 360°',
      subtitle:
          'Calculá requerimientos calóricos, METs deportivos, macronutrientes periodizados y curvas OMS/CDC en segundos.',
      icon: Icons.monitor_heart_rounded,
      tags: [
        'METs Deportivos',
        'Curvas OMS / CDC',
        'Macronutrientes',
        'Composición Corporal',
      ],
      gradientColors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
    ),
    OnboardingSlide(
      emoji: '📑',
      badge: 'PLANIFICACIÓN NUTRICIONAL',
      title: 'Menús, Dietas & Listas de Intercambio',
      subtitle:
          'Diseñá planes nutricionales, gestioná equivalentes por grupos de alimentos e inspirate con recetas e IA.',
      icon: Icons.menu_book_rounded,
      tags: [
        'Listas de Intercambio',
        'Planes Semanales',
        'Recetas con IA',
        'Porciones Claras',
      ],
      gradientColors: [Color(0xFF6366F1), Color(0xFF4338CA)],
    ),
    OnboardingSlide(
      emoji: '👥',
      badge: 'GESTIÓN INTEGRAL',
      title: 'Gestión de Pacientes & Equipo Multidisciplinario',
      subtitle:
          'Seguimiento clínico continuo, agenda de consultas y colaboración fluida con tu equipo de salud.',
      icon: Icons.groups_rounded,
      tags: [
        'Historial Clínico',
        'Agenda de Consultas',
        'Equipo Interdisciplinario',
        'Seguimiento Continuo',
      ],
      gradientColors: [Color(0xFF10B981), Color(0xFF059669)],
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _completeOnboarding() async {
    final authStorage = AuthStorage();
    await authStorage.setOnboardingCompleted(true);
    if (!mounted) return;

    final auth = context.read<AuthProvider>();
    if (auth.isAuthenticated) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationShell()),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginPage()),
      );
    }
  }

  void _nextPage() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLastSlide = _currentPage == _slides.length - 1;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.bgDark : AppTheme.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar with Nutringest Logo and Saltar (Skip) Action
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const NutringestLogo(
                    width: 36,
                    height: 36,
                    showText: true,
                    fontSize: 18,
                  ),
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: isLastSlide ? 0.0 : 1.0,
                    child: IgnorePointer(
                      ignoring: isLastSlide,
                      child: TextButton(
                        onPressed: _completeOnboarding,
                        style: TextButton.styleFrom(
                          foregroundColor: isDark
                              ? AppTheme.accentPurple
                              : AppTheme.primaryPurple,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'Saltar',
                          style: GoogleFonts.montserrat(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // PageView with the 3 slides
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemBuilder: (context, index) {
                  return _buildSlideCard(_slides[index], isDark);
                },
              ),
            ),

            // Bottom controls: animated dots + CTA buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated Page Indicators adapting to Light/Dark mode
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (index) {
                      return _buildDotIndicator(index, isDark);
                    }),
                  ),
                  const SizedBox(height: 22),

                  // Primary Action Button (Siguiente / Comenzar / Iniciar Sesión)
                  ElevatedButton(
                    onPressed: _nextPage,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          isLastSlide ? 'Comenzar' : 'Siguiente',
                          style: GoogleFonts.montserrat(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          isLastSlide
                              ? Icons.arrow_forward_rounded
                              : Icons.arrow_forward_rounded,
                          size: 18,
                        ),
                      ],
                    ),
                  ),

                  // On slide 3, also offer direct "Iniciar Sesión" link
                  if (isLastSlide) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _completeOnboarding,
                      child: Text(
                        'Iniciar Sesión',
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppTheme.accentPurple
                              : AppTheme.primaryPurple,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDotIndicator(int index, bool isDark) {
    final bool isSelected = _currentPage == index;
    final activeColor = isDark ? AppTheme.accentPurple : AppTheme.primaryPurple;
    final inactiveColor = isDark
        ? Colors.white.withValues(alpha: 0.18)
        : AppTheme.primaryPurple.withValues(alpha: 0.18);

    return GestureDetector(
      onTap: () {
        _pageController.animateToPage(
          index,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
        );
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        margin: const EdgeInsets.symmetric(horizontal: 4.0),
        width: isSelected ? 28.0 : 8.0,
        height: 8.0,
        decoration: BoxDecoration(
          color: isSelected ? activeColor : inactiveColor,
          borderRadius: BorderRadius.circular(4.0),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.35),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
      ),
    );
  }

  Widget _buildSlideCard(OnboardingSlide slide, bool isDark) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 10),
            // Hero Card Container
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 28.0, horizontal: 20.0),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.cardDark : AppTheme.cardLight,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withValues(alpha: 0.3)
                        : slide.gradientColors.first.withValues(alpha: 0.08),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Central Icon Container with Gradient and Glow
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: slide.gradientColors
                            .map((c) => c.withValues(alpha: isDark ? 0.35 : 0.16))
                            .toList(),
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: slide.gradientColors.first.withValues(alpha: 0.4),
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        slide.icon,
                        size: 44,
                        color: isDark
                            ? slide.gradientColors.first
                            : slide.gradientColors.last,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Feature Pills Wrap
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: slide.tags.map((tag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppTheme.bgDark
                              : AppTheme.bgLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark
                                ? AppTheme.borderDark
                                : AppTheme.borderLight,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: slide.gradientColors.first,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              tag,
                              style: GoogleFonts.montserrat(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? AppTheme.textPrimaryDark
                                    : AppTheme.textPrimaryLight,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Badge with emoji & category
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: (isDark ? AppTheme.accentPurple : AppTheme.primaryPurple)
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: (isDark ? AppTheme.accentPurple : AppTheme.primaryPurple)
                      .withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(slide.emoji, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text(
                    slide.badge,
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: isDark
                          ? AppTheme.accentPurple
                          : AppTheme.primaryPurple,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Slide Title
            Text(
              '${slide.emoji} ${slide.title}',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 21,
                fontWeight: FontWeight.bold,
                color: isDark
                    ? AppTheme.textPrimaryDark
                    : AppTheme.textPrimaryLight,
                height: 1.25,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 12),

            // Slide Subtitle
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Text(
                slide.subtitle,
                textAlign: TextAlign.center,
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: isDark
                      ? AppTheme.textSecondaryDark
                      : AppTheme.textSecondaryLight,
                  height: 1.45,
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}
