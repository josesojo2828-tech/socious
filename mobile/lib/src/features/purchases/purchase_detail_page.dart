import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../shared/widgets/states.dart';
import 'data/purchases_api.dart';

class PurchaseDetailPage extends ConsumerStatefulWidget {
  const PurchaseDetailPage({super.key, required this.purchaseId});

  final String purchaseId;

  @override
  ConsumerState<PurchaseDetailPage> createState() =>
      _PurchaseDetailPageState();
}

class _PurchaseDetailPageState extends ConsumerState<PurchaseDetailPage> {
  bool _receiving = false;

  static final _money = NumberFormat.currency(
    locale: 'es_VE',
    symbol: r'$',
    decimalDigits: 2,
  );

  Future<void> _receive(PurchaseDetail detail) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Recibir mercancía'),
        content: Text(
          'Se sumará el stock de ${detail.items.length} línea(s) de '
          '${detail.summary.purchaseNumber}. No se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Recibir'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _receiving = true);
    try {
      await ref.read(purchasesApiProvider).receive(widget.purchaseId);
      ref.invalidate(purchaseProvider(widget.purchaseId));
      ref.invalidate(purchasesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mercancía recibida y stock actualizado.')),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _receiving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final purchase = ref.watch(purchaseProvider(widget.purchaseId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          purchase.valueOrNull?.summary.purchaseNumber ?? 'Compra',
        ),
      ),
      body: purchase.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: '$error',
          onRetry: () => ref.invalidate(purchaseProvider(widget.purchaseId)),
        ),
        data: (detail) {
          final summary = detail.summary;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        summary.supplierName ?? 'Sin proveedor',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (summary.issueDate != null)
                            DateFormat('dd/MM/yyyy').format(summary.issueDate!),
                          summary.isPending ? 'Por recibir' : summary.status,
                        ].join(' · '),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _money.format(summary.totalUSD),
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Líneas', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              if (detail.items.isEmpty)
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.info_outline),
                    title: Text('La compra no tiene líneas.'),
                  ),
                )
              else
                Card(
                  child: Column(
                    children: [
                      for (final item in detail.items)
                        ListTile(
                          dense: true,
                          title: Text(item.productName),
                          subtitle: Text(_plain(item.quantity)),
                          trailing: Text(_money.format(item.totalUSD)),
                        ),
                    ],
                  ),
                ),
              if ((detail.notes ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('Notas', style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(detail.notes!),
              ],
              if (summary.isPending) ...[
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _receiving ? null : () => _receive(detail),
                  icon: _receiving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.inventory),
                  label: const Text('Recibir mercancía'),
                ),
              ] else ...[
                const SizedBox(height: 24),
                Text(
                  'Esta compra ya no tiene nada por recibir.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  static String _plain(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}
