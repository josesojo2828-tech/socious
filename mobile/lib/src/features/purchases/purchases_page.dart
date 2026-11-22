import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/widgets/states.dart';
import 'data/purchases_api.dart';
import 'purchase_detail_page.dart';

class PurchasesPage extends ConsumerStatefulWidget {
  const PurchasesPage({super.key});

  @override
  ConsumerState<PurchasesPage> createState() => _PurchasesPageState();
}

class _PurchasesPageState extends ConsumerState<PurchasesPage> {
  final _search = TextEditingController();
  String _query = '';

  static final _money = NumberFormat.currency(
    locale: 'es_VE',
    symbol: r'$',
    decimalDigits: 2,
  );

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final purchases = ref.watch(purchasesProvider(_query));
    final theme = Theme.of(context);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            controller: _search,
            textInputAction: TextInputAction.search,
            onSubmitted: (value) => setState(() => _query = value.trim()),
            decoration: const InputDecoration(
              hintText: 'Número, proveedor o nota',
              prefixIcon: Icon(Icons.search),
            ),
          ),
        ),
        Expanded(
          child: purchases.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorRetry(
              message: '$error',
              onRetry: () => ref.invalidate(purchasesProvider(_query)),
            ),
            data: (page) {
              if (page.isEmpty) {
                return const EmptyState(
                  message: 'Todavía no hay compras registradas.',
                  icon: Icons.shopping_cart_outlined,
                );
              }

              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(purchasesProvider(_query)),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: page.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final purchase = page.items[index];
                    final pending = purchase.isPending;
                    return Card(
                      child: ListTile(
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                PurchaseDetailPage(purchaseId: purchase.id),
                          ),
                        ),
                        title: Text(purchase.purchaseNumber),
                        subtitle: Text(
                          [
                            if (purchase.supplierName != null)
                              purchase.supplierName!,
                            if (purchase.issueDate != null)
                              DateFormat('dd/MM/yyyy')
                                  .format(purchase.issueDate!),
                            '${purchase.itemsCount} línea(s)',
                          ].join(' · '),
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              _money.format(purchase.totalUSD),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              pending ? 'Por recibir' : purchase.status,
                              style: TextStyle(
                                fontSize: 11,
                                color: pending
                                    ? theme.colorScheme.secondary
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
      ],
    );
  }
}
