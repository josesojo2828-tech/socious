import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../auth/auth_controller.dart';
import '../../core/exchange/rates.dart';

/// Landing tab: who is using the app, in which workspace, and today's rates.
///
/// The rates card is the first real authenticated request, so a broken base URL
/// or an expired session is visible the moment the app opens.
class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final rates = ref.watch(ratesProvider);
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(ratesProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            _greeting(),
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            auth.user?.displayName ?? '',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.storefront_outlined),
              title: Text(auth.activeWorkspace?.name ?? 'Sin espacio activo'),
              subtitle: Text(
                auth.activeWorkspace?.role ?? 'Elegí un espacio',
              ),
              trailing: Icon(
                Icons.verified_outlined,
                color: theme.colorScheme.secondary,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Tasas de hoy', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          rates.when(
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (error, _) => Card(
              child: ListTile(
                leading: Icon(Icons.cloud_off, color: theme.colorScheme.error),
                title: const Text('No se pudieron cargar las tasas'),
                subtitle: Text('$error'),
                trailing: IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.invalidate(ratesProvider),
                ),
              ),
            ),
            data: (snapshot) => Row(
              children: [
                Expanded(
                  child: _RateCard(
                    label: 'BCV',
                    value: snapshot.rateBcv,
                    suffix: 'Bs / USD',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _RateCard(
                    label: 'USDT',
                    value: snapshot.rateUsdt,
                    suffix: 'Bs / USDT',
                    accent: AppTheme.gold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Módulos', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          const _ModuleGrid(),
        ],
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}

class _RateCard extends StatelessWidget {
  const _RateCard({
    required this.label,
    required this.value,
    required this.suffix,
    this.accent,
  });

  final String label;
  final double value;
  final String suffix;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            Text(
              value.toStringAsFixed(2),
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: accent,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              suffix,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModuleGrid extends StatelessWidget {
  const _ModuleGrid();

  static const _modules = <({IconData icon, String label, String status})>[
    (icon: Icons.inventory_2_outlined, label: 'Inventario', status: 'T5'),
    (icon: Icons.point_of_sale_outlined, label: 'Punto de venta', status: 'T9'),
    (icon: Icons.shopping_cart_outlined, label: 'Compras', status: 'T8'),
    (icon: Icons.people_outline, label: 'Clientes', status: 'T6'),
    (icon: Icons.local_shipping_outlined, label: 'Proveedores', status: 'T7'),
    (icon: Icons.settings_outlined, label: 'Configuración', status: 'T10'),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        for (final module in _modules)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(module.icon),
                  Text(
                    module.label,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    module.status,
                    style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
