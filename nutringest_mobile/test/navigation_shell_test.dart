import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nutringest_mobile/core/navigation/main_navigation_shell.dart';
import 'package:nutringest_mobile/core/navigation/app_drawer.dart';
import 'package:nutringest_mobile/core/theme/theme_provider.dart';
import 'package:nutringest_mobile/features/auth/providers/auth_provider.dart';
import 'package:nutringest_mobile/features/dashboard/providers/sidebar_provider.dart';
import 'package:nutringest_mobile/features/patients/providers/patients_provider.dart';
import 'package:nutringest_mobile/features/clinical/providers/clinical_provider.dart';
import 'package:nutringest_mobile/features/nutrition/providers/nutrition_provider.dart';
import 'package:nutringest_mobile/features/calculators/providers/calculators_provider.dart';

Widget createTestWidget(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => SidebarProvider()),
      ChangeNotifierProvider(create: (_) => PatientsProvider()),
      ChangeNotifierProvider(create: (_) => ClinicalProvider()),
      ChangeNotifierProvider(create: (_) => NutritionProvider()),
      ChangeNotifierProvider(create: (_) => CalculatorsProvider()),
    ],
    child: Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        return MaterialApp(
          themeMode: themeProvider.themeMode,
          home: child,
        );
      },
    ),
  );
}

void main() {
  testWidgets('MainNavigationShell renders 5 navigation destinations and switches tabs',
      (WidgetTester tester) async {
    await tester.pumpWidget(createTestWidget(const MainNavigationShell()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify 5 navigation destinations exist in NavigationBar (Icon-Only)
    expect(find.byType(NavigationDestination), findsNWidgets(5));
    expect(find.byIcon(Icons.space_dashboard_rounded), findsOneWidget);
    expect(find.byIcon(Icons.people_outline_rounded), findsOneWidget);
    expect(find.byIcon(Icons.restaurant_menu_outlined), findsOneWidget);
    expect(find.byIcon(Icons.groups_outlined), findsOneWidget);
    expect(find.byIcon(Icons.person_outline_rounded), findsOneWidget);

    // Tap on Gestión tab (index 1)
    await tester.tap(find.byIcon(Icons.people_outline_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Gestión Clínica & Agenda'), findsOneWidget);

    // Tap on Nutrición tab (index 2)
    await tester.tap(find.byIcon(Icons.restaurant_menu_outlined));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Nutrición & Planificación'), findsOneWidget);

    // Tap on Comunidad tab (index 3)
    await tester.tap(find.byIcon(Icons.groups_outlined));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Comunidad Nutringest'), findsOneWidget);

    // Tap on Perfil tab (index 4)
    await tester.tap(find.byIcon(Icons.person_outline_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Perfil del profesional'), findsOneWidget);
  });

  testWidgets('AppDrawer renders sections and items matching web 1:1', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(createTestWidget(const Scaffold(body: AppDrawer())));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify drawer branding
    expect(find.text('Nutringest'), findsWidgets);

    // Verify 5 sections matching web 1:1
    expect(find.text('PANEL GENERAL'), findsOneWidget);
    expect(find.text('MI WEB & ANALÍTICAS'), findsOneWidget);
    expect(find.text('GESTIÓN CLÍNICA'), findsOneWidget);
    expect(find.text('HERRAMIENTAS NUTRICIONALES'), findsOneWidget);
    expect(find.text('COMUNIDAD & RED'), findsOneWidget);

    // Verify key items
    expect(find.text('Panel de Control'), findsOneWidget);
    expect(find.text('Portafolio Profesional'), findsOneWidget);
    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('Pacientes'), findsOneWidget);
    expect(find.text('Menús'), findsOneWidget);
    expect(find.text('Lista de Intercambio'), findsOneWidget);
    expect(find.text('Todos los Alimentos'), findsOneWidget);
    expect(find.text('Alimentos de Intercambio'), findsOneWidget);
    expect(find.text('Condimentos'), findsOneWidget);
    expect(find.text('Alimentación Colectiva'), findsOneWidget);
    expect(find.text('Comunidad'), findsOneWidget);
    expect(find.text('Campus'), findsOneWidget);
    expect(find.text('Marketplace'), findsOneWidget);

    // Verify footer
    expect(find.text('Cerrar Sesión'), findsOneWidget);
  });
}
