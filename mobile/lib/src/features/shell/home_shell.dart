import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../dashboard/dashboard_page.dart';
import '../inventory/inventory_page.dart';
import '../pos/pos_page.dart';
import '../purchases/purchases_page.dart';
import 'more_page.dart';

/// The authenticated shell: one route with a bottom bar. Nested routes arrive
/// when a deep link needs them; today the tabs are state, not URLs.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _tabs = <({String title, IconData icon})>[
    (title: 'Inicio', icon: Icons.dashboard_outlined),
    (title: 'Inventario', icon: Icons.inventory_2_outlined),
    (title: 'Ventas', icon: Icons.point_of_sale_outlined),
    (title: 'Compras', icon: Icons.shopping_cart_outlined),
    (title: 'Más', icon: Icons.menu),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    final pages = <Widget>[
      const DashboardPage(),
      const InventoryPage(),
      const PosPage(),
      const PurchasesPage(),
      const MorePage(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_tabs[_index].title),
            Text(
              auth.activeWorkspace?.name ?? 'Sin espacio',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => setState(() => _index = index),
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(icon: Icon(tab.icon), label: tab.title),
        ],
      ),
    );
  }
}
