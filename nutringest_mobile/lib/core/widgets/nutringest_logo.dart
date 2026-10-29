import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// NutringestLogo: Reusable brand logo widget that adapts dynamically to Light/Dark mode.
class NutringestLogo extends StatelessWidget {
  final double width;
  final double height;
  final bool showText;
  final double fontSize;
  final Color? color;
  final bool useImagotipo;

  const NutringestLogo({
    super.key,
    this.width = 44,
    this.height = 44,
    this.showText = false,
    this.fontSize = 20,
    this.color,
    this.useImagotipo = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final String assetName = useImagotipo
        ? (isDark ? 'assets/images/ImagotipoBlanco.png' : 'assets/images/ImagotipoPurpura.png')
        : (isDark ? 'assets/images/IsologoBlanco.png' : 'assets/images/IsologoPurpura.png');

    final Widget logoImage = Image.asset(
      assetName,
      width: width,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        // Fallback icon container if image asset fails
        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: color ?? (isDark ? AppTheme.accentPurple : AppTheme.primaryPurple),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            Icons.spa_rounded,
            color: Colors.white,
            size: height * 0.6,
          ),
        );
      },
    );

    if (!showText) {
      return logoImage;
    }

    final textColor = color ?? (isDark ? Colors.white : AppTheme.textPrimaryLight);

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        logoImage,
        const SizedBox(width: 10),
        Text(
          'Nutringest',
          style: GoogleFonts.montserrat(
            color: textColor,
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }
}
