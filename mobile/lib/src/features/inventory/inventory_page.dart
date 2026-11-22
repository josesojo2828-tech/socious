import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'categories_page.dart';
import 'data/inventory_api.dart';
import 'data/product_models.dart';
import 'product_detail_page.dart';
import 'product_form_page.dart';
import 'scan_page.dart';

/// Product list with keyboard and barcode search.
///
/// The server matches name, SKU and barcode with the same `q`, so scanning is
/// just another way to fill the search box.
class InventoryPage extends ConsumerStatefulWidget {
  const InventoryPage({super.key});

  @override
  ConsumerState<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends ConsumerState<InventoryPage> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';

  static final _money = NumberFormat.currency(
    locale: 'es_VE',
    symbol: r'$',
    decimalDigits: 2,
  );

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => _query = value.trim());
    });
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const ProductFormPage()),
    );
    if (created == true) ref.invalidate(productsProvider(_query));
  }

  Future<void> _openCategories() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => const CategoriesPage()),
    );
  }

  Future<void> _scan() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const ScanPage()),
    );
    if (code == null) return;

    _debounce?.cancel();
    _search.text = code;
    setState(() => _query = code);
  }

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(productsProvider(_query));
    final theme = Theme.of(context);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _create,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Nuevo producto'),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _openCategories,
                icon: const Icon(Icons.category_outlined, size: 18),
                label: const Text('Categorías'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  key: const Key('inventory-search'),
                  controller: _search,
                  onChanged: _onChanged,
                  onSubmitted: (value) =>
                      setState(() => _query = value.trim()),
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Nombre, SKU o código de barras',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: 'Escanear código',
                onPressed: _scan,
                icon: const Icon(Icons.qr_code_scanner),
              ),
            ],
          ),
        ),
        Expanded(
          child: products.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => _ErrorState(
              message: '$error',
              onRetry: () => ref.invalidate(productsProvider(_query)),
            ),
            data: (page) {
              if (page.isEmpty) {
                return _EmptyState(hasQuery: _query.isNotEmpty);
              }

              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(productsProvider(_query)),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: page.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final product = page.items[index];
                    return Card(
                      child: ListTile(
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                ProductDetailPage(productId: product.id),
                          ),
                        ),
                        leading: _ProductAvatar(product: product),
                        title: Text(
                          product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          [
                            if (product.sku.isNotEmpty) product.sku,
                            if (product.categoryName != null)
                              product.categoryName!,
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              _money.format(product.salePriceUSD),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              product.isService
                                  ? 'Servicio'
                                  : '${_trim(product.stock)} ${product.unit}',
                              style: TextStyle(
                                fontSize: 11,
                                color: product.isLowStock
                                    ? theme.colorScheme.error
                                    : theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
        _FooterHint(total: products.valueOrNull?.total),
      ],
    );
  }

  static String _trim(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}

class _FooterHint extends StatelessWidget {
  const _FooterHint({this.total});

  final int? total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          total == null ? 'Cargando catálogo…' : '$total producto(s)',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _ProductAvatar extends StatelessWidget {
  const _ProductAvatar({required this.product});

  final ProductSummary product;

  @override
  Widget build(BuildContext context) {
    if (!product.hasRenderableImage) {
      return CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: const Icon(Icons.inventory_2_outlined, size: 20),
      );
    }

    return CircleAvatar(
      backgroundImage: NetworkImage(product.imageUrl!),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 40),
            const SizedBox(height: 12),
            Text(
              hasQuery
                  ? 'Nada coincide con tu búsqueda.'
                  : 'Todavía no hay productos cargados.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
