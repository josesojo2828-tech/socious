import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'data/inventory_api.dart';

class ProductDetailPage extends ConsumerWidget {
  const ProductDetailPage({super.key, required this.productId});

  final String productId;

  static final _money = NumberFormat.currency(
    locale: 'es_VE',
    symbol: r'$',
    decimalDigits: 2,
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productProvider(productId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(product.valueOrNull?.name ?? 'Producto')),
      body: product.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('$error', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () =>
                      ref.invalidate(productProvider(productId)),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
        data: (item) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (item.hasRenderableImage)
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  item.imageUrl!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              _money.format(item.salePriceUSD),
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.isService
                  ? 'Servicio'
                  : '${_trim(item.stock)} ${item.unit} en stock',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: item.isLowStock
                    ? theme.colorScheme.error
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (item.isLowStock)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Stock bajo: el mínimo es ${_trim(item.minStock)}.',
                  style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
                ),
              ),
            const SizedBox(height: 20),
            Card(
              child: Column(
                children: [
                  _Row(label: 'SKU', value: item.sku),
                  if (item.barcode != null && item.barcode!.isNotEmpty)
                    _Row(label: 'Código de barras', value: item.barcode!),
                  if (item.categoryName != null)
                    _Row(label: 'Categoría', value: item.categoryName!),
                  _Row(label: 'Unidad', value: item.unit),
                  _Row(
                    label: 'Estado',
                    value: item.isActive ? 'Activo' : item.status,
                  ),
                  if (item.isRawMaterial)
                    const _Row(label: 'Tipo', value: 'Materia prima'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Kardex, ajustes de stock y presentaciones llegan en la próxima '
              'entrega.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _trim(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(label),
      trailing: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 200),
        child: Text(
          value,
          textAlign: TextAlign.end,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
