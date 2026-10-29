import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nutringest_mobile/features/nutrition/models/menu_model.dart';
import 'package:nutringest_mobile/features/nutrition/presentation/pages/menu_list_page.dart';

void main() {
  test('MenuModel.fromJson handles nulls and unexpected shapes', () {
    final emptyJson = <String, dynamic>{};
    final menu = MenuModel.fromJson(emptyJson);

    expect(menu.id, '');
    expect(menu.name, '');
    expect(menu.category, 'OTHER');
    expect(menu.totalKcal, 0.0);
    expect(menu.totalProtein, 0.0);
    expect(menu.totalCarbs, 0.0);
    expect(menu.totalFats, 0.0);
    expect(menu.items, isEmpty);
    expect(menu.condiments, isEmpty);
    expect(menu.itemsCount, 0);
  });

  test('MenuDashboardMetricsModel.fromJson handles nulls', () {
    final emptyJson = <String, dynamic>{};
    final metrics = MenuDashboardMetricsModel.fromJson(emptyJson);

    expect(metrics.totalMenus, 0);
    expect(metrics.assignedPatients, 0);
    expect(metrics.topCategory, 'N/A');
    expect(metrics.avgCalories, 0.0);
    expect(metrics.avgProtein, 0.0);
    expect(metrics.avgCarbs, 0.0);
    expect(metrics.avgFats, 0.0);
  });

  testWidgets('MenuListPage renders all 9 menus cleanly without layout or null exceptions', (WidgetTester tester) async {
    // 9 realistic menus reflecting the GET /api/menu backend dataset
    final sampleMenus = [
      MenuModel(
        id: '14a88fe3-a04f-44e1-a9a9-2f692fa1bc03',
        name: 'Arepa con queso',
        category: 'DINNER',
        totalKcal: 0.0,
        totalProtein: 0.0,
        totalCarbs: 0.0,
        totalFats: 0.0,
        itemsCount: 0,
        description: 'Arepa con queso',
        tags: null,
        imageUrl: null,
      ),
      MenuModel(
        id: '9048d3ca-113f-4022-bb18-e7088bee1c63',
        name: 'arroz con pollo',
        category: 'LUNCH',
        totalKcal: 0.0,
        totalProtein: 0.0,
        totalCarbs: 0.0,
        totalFats: 0.0,
        itemsCount: 0,
        description: 'arroz con 150 gr de pollo a la plancha',
        tags: 'rapido',
        imageUrl: null,
      ),
      MenuModel(
        id: '862f581d-bc46-44b4-b6c3-f744fb98b418',
        name: 'Aguacate y tortillas',
        category: 'BREAKFAST',
        totalKcal: 0.0,
        totalProtein: 0.0,
        totalCarbs: 0.0,
        totalFats: 0.0,
        itemsCount: 0,
        description: null,
        tags: 'Rápido',
        imageUrl: null,
      ),
      MenuModel(
        id: 'fcc6a998-d300-448e-b77c-007c2b16d2a8',
        name: 'Arepa sencilla',
        category: 'BREAKFAST',
        totalKcal: 0.0,
        totalProtein: 0.0,
        totalCarbs: 0.0,
        totalFats: 0.0,
        itemsCount: 0,
        description: null,
        tags: 'Rápido',
        imageUrl: null,
      ),
      MenuModel(
        id: '99ab9304-4c43-491f-b56c-20581067291f',
        name: 'Arepa fortificada',
        category: 'BREAKFAST',
        totalKcal: 291.94,
        totalProtein: 24.78,
        totalCarbs: 41.32,
        totalFats: 3.06,
        itemsCount: 4,
        description: 'Arepa con afrecho, zanahoria, calabacín rellena de pollo desmenuzado y aguacate',
        tags: 'Desayuno fitness',
        imageUrl: null,
      ),
      MenuModel(
        id: 'demo-menu-desayuno-fitness-avena-frutas',
        name: 'Desayuno Fitness - Avena & Frutas',
        category: 'BREAKFAST',
        totalKcal: 350.0,
        totalProtein: 15.0,
        totalCarbs: 55.0,
        totalFats: 6.0,
        itemsCount: 3,
        description: 'Desayuno balanceado ideal para comenzar el día con energía.',
        tags: 'fitness,avena,frutas',
        imageUrl: null,
      ),
      MenuModel(
        id: 'demo-menu-almuerzo-clasico-pollo-arroz',
        name: 'Almuerzo Clásico - Pollo & Arroz',
        category: 'LUNCH',
        totalKcal: 520.0,
        totalProtein: 42.0,
        totalCarbs: 60.0,
        totalFats: 12.0,
        itemsCount: 4,
        description: 'Almuerzo completo y balanceado con pechuga de pollo.',
        tags: 'clasico,pollo,arroz',
        imageUrl: null,
      ),
      MenuModel(
        id: 'demo-menu-cena-ligera-crema-de-calabacin',
        name: 'Cena Ligera - Crema de Calabacín',
        category: 'DINNER',
        totalKcal: 220.0,
        totalProtein: 18.0,
        totalCarbs: 20.0,
        totalFats: 7.0,
        itemsCount: 2,
        description: 'Cena reconfortante y baja en calorías.',
        tags: 'ligera,crema,vegetales',
        imageUrl: null,
      ),
      MenuModel(
        id: 'demo-menu-merienda-snack-frutos-secos',
        name: 'Merienda Saludable - Frutos Secos & Té',
        category: 'SNACK',
        totalKcal: 180.0,
        totalProtein: 6.0,
        totalCarbs: 10.0,
        totalFats: 14.0,
        itemsCount: 2,
        description: 'Snack energético para media tarde.',
        tags: 'snack,saludable',
        imageUrl: null,
      ),
    ];

    final metrics = const MenuDashboardMetricsModel(
      totalMenus: 9,
      assignedPatients: 3,
      topCategory: 'Desayuno',
      avgCalories: 340.5,
      avgProtein: 22.4,
      avgCarbs: 38.1,
      avgFats: 9.2,
    );

    // Set screen size tall enough to view multiple items or test scrolling
    tester.view.physicalSize = const Size(390, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        home: MenuListPage(
          initialMenus: sampleMenus,
          initialMetrics: metrics,
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Title
    expect(find.text('Catálogo de Menús'), findsOneWidget);

    // Verify KPI Cards
    expect(find.text('Total Menús'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('341 kcal'), findsOneWidget);
    expect(find.text('Macros Promedio'), findsOneWidget);

    // Verify first menus are present
    expect(find.text('Arepa con queso'), findsAtLeastNWidgets(1));
    expect(find.text('arroz con pollo'), findsAtLeastNWidgets(1));

    // Scroll to verify subsequent items
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await tester.pumpAndSettle();

    expect(find.text('Almuerzo Clásico - Pollo & Arroz'), findsAtLeastNWidgets(1));

    // Scroll to the end
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await tester.pumpAndSettle();

    expect(find.text('Merienda Saludable - Frutos Secos & Té'), findsAtLeastNWidgets(1));

    // Verify pagination bar at bottom
    expect(find.text('Página 1 de 1'), findsOneWidget);

    // Test a very narrow screen (320px)
    tester.view.physicalSize = const Size(320, 800);
    await tester.pumpAndSettle();

    expect(find.text('Catálogo de Menús'), findsOneWidget);
  });
}
