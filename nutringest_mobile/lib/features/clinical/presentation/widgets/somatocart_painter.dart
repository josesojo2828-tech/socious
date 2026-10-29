import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';

class SomatocartPoint {
  final double x;
  final double y;
  final String label;
  final DateTime date;
  final String category;

  const SomatocartPoint({
    required this.x,
    required this.y,
    required this.label,
    required this.date,
    required this.category,
  });
}

class SomatocartWidget extends StatelessWidget {
  final List<SomatocartPoint> points;
  final double height;

  const SomatocartWidget({
    super.key,
    required this.points,
    this.height = 360,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E2C) : const Color(0xFFF9F9FC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: CustomPaint(
          painter: SomatocartPainter(
            points: points,
            isDark: isDark,
          ),
        ),
      ),
    );
  }
}

class SomatocartPainter extends CustomPainter {
  final List<SomatocartPoint> points;
  final bool isDark;

  SomatocartPainter({
    required this.points,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 + 10);
    
    // Escala del sistema de coordenadas Heath-Carter:
    // X va de -9 a 9
    // Y va de -9 a 15
    const double minX = -9.0;
    const double maxX = 9.0;
    const double minY = -9.0;
    const double maxY = 15.0;

    final double xScale = (size.width * 0.82) / (maxX - minX);
    final double yScale = (size.height * 0.78) / (maxY - minY);

    Offset toCanvas(double x, double y) {
      final px = center.dx + (x * xScale);
      final py = center.dy - (y * yScale);
      return Offset(px, py);
    }

    // 1. Dibujar Rejilla y Ejes Principales
    final gridPaint = Paint()
      ..color = (isDark ? Colors.white12 : Colors.grey.withValues(alpha: 0.2))
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final axisPaint = Paint()
      ..color = (isDark ? Colors.white38 : Colors.grey.shade500)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    // Lineas horizontales y verticales secundarias
    for (double x = -8; x <= 8; x += 2) {
      final p1 = toCanvas(x, minY);
      final p2 = toCanvas(x, maxY);
      canvas.drawLine(p1, p2, gridPaint);
    }
    for (double y = -8; y <= 14; y += 2) {
      final p1 = toCanvas(minX, y);
      final p2 = toCanvas(maxX, y);
      canvas.drawLine(p1, p2, gridPaint);
    }

    // Ejes X e Y principales
    final axisX1 = toCanvas(minX, 0);
    final axisX2 = toCanvas(maxX, 0);
    canvas.drawLine(axisX1, axisX2, axisPaint);

    final axisY1 = toCanvas(0, minY);
    final axisY2 = toCanvas(0, maxY);
    canvas.drawLine(axisY1, axisY2, axisPaint);

    // 2. Dibujar Triángulo de Heath-Carter (Límites somatotípicos)
    final topVertex = toCanvas(0, 14);
    final leftVertex = toCanvas(-8, -6);
    final rightVertex = toCanvas(8, -6);

    final trianglePath = Path()
      ..moveTo(topVertex.dx, topVertex.dy)
      ..lineTo(leftVertex.dx, leftVertex.dy)
      ..lineTo(rightVertex.dx, rightVertex.dy)
      ..close();

    final triangleFill = Paint()
      ..color = AppTheme.primaryPurple.withValues(alpha: isDark ? 0.08 : 0.04)
      ..style = PaintingStyle.fill;

    final triangleStroke = Paint()
      ..color = AppTheme.primaryPurple.withValues(alpha: 0.35)
      ..strokeWidth = 1.8
      ..style = PaintingStyle.stroke;

    canvas.drawPath(trianglePath, triangleFill);
    canvas.drawPath(trianglePath, triangleStroke);

    // 3. Dibujar Etiquetas de Regiones Somatotípicas (MESO, ENDO, ECTO)
    final textStyleRegion = GoogleFonts.montserrat(
      fontSize: 11,
      fontWeight: FontWeight.bold,
      color: isDark ? AppTheme.accentPurple : AppTheme.primaryPurple,
      letterSpacing: 1.0,
    );

    _drawText(canvas, 'MESOMORFIA', topVertex + const Offset(0, -18), textStyleRegion);
    _drawText(canvas, 'ENDOMORFIA', leftVertex + const Offset(-10, 16), textStyleRegion);
    _drawText(canvas, 'ECTOMORFIA', rightVertex + const Offset(10, 16), textStyleRegion);

    // Etiqueta de Origen (0,0)
    final textStyleOrigin = GoogleFonts.montserrat(
      fontSize: 9,
      color: isDark ? Colors.white54 : Colors.black45,
    );
    _drawText(canvas, '(0,0)', center + const Offset(12, 12), textStyleOrigin);

    if (points.isEmpty) return;

    // 4. Dibujar Trayectoria y Puntos de Evolución
    final trajectoryPath = Path();
    final sortedPoints = List<SomatocartPoint>.from(points)
      ..sort((a, b) => a.date.compareTo(b.date));

    final linePaint = Paint()
      ..color = AppTheme.primaryPurple
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < sortedPoints.length; i++) {
      final pt = sortedPoints[i];
      final pos = toCanvas(pt.x, pt.y);

      if (i == 0) {
        trajectoryPath.moveTo(pos.dx, pos.dy);
      } else {
        trajectoryPath.lineTo(pos.dx, pos.dy);
      }
    }

    if (sortedPoints.length > 1) {
      canvas.drawPath(trajectoryPath, linePaint);
    }

    // Dibujar cada punto registrado
    for (int i = 0; i < sortedPoints.length; i++) {
      final pt = sortedPoints[i];
      final pos = toCanvas(pt.x, pt.y);
      final isLatest = (i == sortedPoints.length - 1);

      if (isLatest) {
        // Halo exterior del punto más reciente
        final haloPaint = Paint()
          ..color = AppTheme.primaryPurple.withValues(alpha: 0.3)
          ..style = PaintingStyle.fill;
        canvas.drawCircle(pos, 14, haloPaint);

        final pinBorderPaint = Paint()
          ..color = Colors.white
          ..strokeWidth = 2.5
          ..style = PaintingStyle.stroke;
        canvas.drawCircle(pos, 8, pinBorderPaint);

        final pinPaint = Paint()
          ..color = AppTheme.primaryPurple
          ..style = PaintingStyle.fill;
        canvas.drawCircle(pos, 8, pinPaint);

        // Card o etiqueta flotante para la coordenada actual
        final coordText = '${pt.category}\n(X: ${pt.x.toStringAsFixed(1)}, Y: ${pt.y.toStringAsFixed(1)})';
        final textStylePoint = GoogleFonts.montserrat(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: isDark ? Colors.white : Colors.black87,
        );

        final textSpan = TextSpan(text: coordText, style: textStylePoint);
        final tp = TextPainter(
          text: textSpan,
          textAlign: TextAlign.center,
          textDirection: TextDirection.ltr,
        );
        tp.layout();

        final bgRect = RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(pos.dx, pos.dy - 28),
            width: tp.width + 16,
            height: tp.height + 8,
          ),
          const Radius.circular(6),
        );

        final bgPaint = Paint()
          ..color = (isDark ? const Color(0xFF2D2D3F) : Colors.white).withValues(alpha: 0.9)
          ..style = PaintingStyle.fill;
        final borderBgPaint = Paint()
          ..color = AppTheme.primaryPurple.withValues(alpha: 0.5)
          ..strokeWidth = 1.0
          ..style = PaintingStyle.stroke;

        canvas.drawRRect(bgRect, bgPaint);
        canvas.drawRRect(bgRect, borderBgPaint);
        tp.paint(canvas, Offset(pos.dx - (tp.width / 2), pos.dy - 28 - (tp.height / 2)));
      } else {
        // Puntos de mediciones anteriores
        final oldPointPaint = Paint()
          ..color = isDark ? Colors.white70 : AppTheme.textSecondaryLight
          ..style = PaintingStyle.fill;
        canvas.drawCircle(pos, 5, oldPointPaint);
      }
    }
  }

  void _drawText(Canvas canvas, String text, Offset position, TextStyle style) {
    final textSpan = TextSpan(text: text, style: style);
    final textPainter = TextPainter(
      text: textSpan,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(position.dx - (textPainter.width / 2), position.dy - (textPainter.height / 2)),
    );
  }

  @override
  bool shouldRepaint(covariant SomatocartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.isDark != isDark;
  }
}
