import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../dashboard/dashboard_page.dart';
import '../inventory/inventory_page.dart';
import 'coming_soon_page.dart';
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
      const ComingSoonPage(
        title: 'Punto de venta',
        icon: Icons.point_of_sale_outlined,
        description:
            'Carrito, totales con las tasas del día y registro de la venta con '
            'los medios de cobro del negocio.',
        bullets: [
          'Agregar productos por búsqueda o escaneo',
          'Totales en USD, Bs y USDT',
          'Cobros mixtos y venta a crédito',
          'Comprobante de la venta',
        ],
      ),
      const ComingSoonPage(
        title: 'Compras',
        icon: Icons.shopping_cart_outlined,
        description:
            'Órdenes de compra y recepción de mercancía desde el teléfono.',
        bullets: [
          'Listado y detalle de compras',
          'Recepción de mercancía y entrada a inventario',
          'Proveedores y sus datos',
        ],
      ),
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
