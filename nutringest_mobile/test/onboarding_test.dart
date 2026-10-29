import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nutringest_mobile/core/storage/auth_storage.dart';
import 'package:nutringest_mobile/core/theme/theme_provider.dart';
import 'package:nutringest_mobile/features/auth/pages/login_page.dart';
import 'package:nutringest_mobile/features/auth/pages/onboarding_page.dart';
import 'package:nutringest_mobile/features/auth/pages/splash_page.dart';
import 'package:nutringest_mobile/features/auth/providers/auth_provider.dart';

Widget createTestWidget(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ChangeNotifierProvider(create: (_) => AuthProvider()),
    ],
    child: MaterialApp(
      home: child,
    ),
  );
}

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('AuthStorage Onboarding', () {
    test('isOnboardingCompleted returns false initially', () async {
      final storage = AuthStorage();
      final isCompleted = await storage.isOnboardingCompleted();
      expect(isCompleted, isFalse);
    });

    test('setOnboardingCompleted sets flag to true', () async {
      final storage = AuthStorage();
      await storage.setOnboardingCompleted();
      final isCompleted = await storage.isOnboardingCompleted();
      expect(isCompleted, isTrue);
    });

    test('setOnboardingCompleted(false) resets flag', () async {
      final storage = AuthStorage();
      await storage.setOnboardingCompleted(true);
      expect(await storage.isOnboardingCompleted(), isTrue);

      await storage.setOnboardingCompleted(false);
      expect(await storage.isOnboardingCompleted(), isFalse);
    });
  });

  group('OnboardingPage UI and Flow', () {
    testWidgets('renders Slide 1, top bar logo and Saltar button',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(const OnboardingPage()));
      await tester.pumpAndSettle();

      // Top bar contains Nutringest and Saltar
      expect(find.text('Nutringest'), findsOneWidget);
      expect(find.text('Saltar'), findsOneWidget);

      // Slide 1 text
      expect(
        find.text('🥗 Nutrición Inteligente & Evaluación Clínica 360°'),
        findsOneWidget,
      );
      expect(
        find.text(
          'Calculá requerimientos calóricos, METs deportivos, macronutrientes periodizados y curvas OMS/CDC en segundos.',
        ),
        findsOneWidget,
      );

      // Bottom button shows "Siguiente"
      expect(find.text('Siguiente'), findsOneWidget);
      expect(find.text('Comenzar'), findsNothing);
    });

    testWidgets('navigates through all 3 slides to Slide 3 with Comenzar',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(const OnboardingPage()));
      await tester.pumpAndSettle();

      // Tap Siguiente -> Goes to Slide 2
      await tester.tap(find.text('Siguiente'));
      await tester.pumpAndSettle();

      expect(
        find.text('📑 Menús, Dietas & Listas de Intercambio'),
        findsOneWidget,
      );
      expect(
        find.text(
          'Diseñá planes nutricionales, gestioná equivalentes por grupos de alimentos e inspirate con recetas e IA.',
        ),
        findsOneWidget,
      );
      expect(find.text('Siguiente'), findsOneWidget);

      // Tap Siguiente -> Goes to Slide 3
      await tester.tap(find.text('Siguiente'));
      await tester.pumpAndSettle();

      expect(
        find.text('👥 Gestión de Pacientes & Equipo Multidisciplinario'),
        findsOneWidget,
      );
      expect(
        find.text(
          'Seguimiento clínico continuo, agenda de consultas y colaboración fluida con tu equipo de salud.',
        ),
        findsOneWidget,
      );

      // On Slide 3, button transitions to "Comenzar" and shows "Iniciar Sesión"
      expect(find.text('Comenzar'), findsOneWidget);
      expect(find.text('Iniciar Sesión'), findsOneWidget);
      expect(find.text('Siguiente'), findsNothing);
    });

    testWidgets('tapping Saltar completes onboarding and navigates to LoginPage',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(const OnboardingPage()));
      await tester.pumpAndSettle();

      // Tap Saltar
      await tester.tap(find.text('Saltar'));
      await tester.pumpAndSettle();

      // Verify onboarding is marked as completed in storage
      final storage = AuthStorage();
      expect(await storage.isOnboardingCompleted(), isTrue);

      // Verify navigated to LoginPage
      expect(find.byType(LoginPage), findsOneWidget);
    });

    testWidgets(
        'completing onboarding from Slide 3 marks completed and navigates to LoginPage',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(const OnboardingPage()));
      await tester.pumpAndSettle();

      // Slide 1 -> Slide 2
      await tester.tap(find.text('Siguiente'));
      await tester.pumpAndSettle();

      // Slide 2 -> Slide 3
      await tester.tap(find.text('Siguiente'));
      await tester.pumpAndSettle();

      // Tap Comenzar on Slide 3
      await tester.tap(find.text('Comenzar'));
      await tester.pumpAndSettle();

      // Verify storage flag
      final storage = AuthStorage();
      expect(await storage.isOnboardingCompleted(), isTrue);

      // Verify navigated to LoginPage
      expect(find.byType(LoginPage), findsOneWidget);
    });
  });

  group('SplashPage Routing Logic', () {
    testWidgets('routes to OnboardingPage when onboarding is not completed',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(const SplashPage()));
      await tester.pumpAndSettle();

      expect(find.byType(OnboardingPage), findsOneWidget);
    });

    testWidgets('routes to LoginPage when onboarding is completed but unauthenticated',
        (WidgetTester tester) async {
      final storage = AuthStorage();
      await storage.setOnboardingCompleted(true);

      await tester.pumpWidget(createTestWidget(const SplashPage()));
      await tester.pumpAndSettle();

      expect(find.byType(LoginPage), findsOneWidget);
    });
  });
}
