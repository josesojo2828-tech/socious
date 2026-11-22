import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/exchange/rates.dart';
import '../../shared/widgets/states.dart';
import '../clients/data/clients_api.dart';
import '../inventory/data/inventory_api.dart';
import '../inventory/data/product_models.dart';
import 'data/pos_api.dart';

class _CartLine {
  _CartLine(this.product, this.quantity);

  final ProductSummary product;
  double quantity;
}

/// Point of sale: search, cart, totals and one collection. Registering the
/// sale is `POST /api/sales`; there is no online payment gateway.
class PosPage extends ConsumerStatefulWidget {
  const PosPage({super.key});

  @override
  ConsumerState<PosPage> createState() => _PosPageState();
}

class _PosPageState extends ConsumerState<PosPage> {
  final _search = TextEditingController();
  final _amount = TextEditingController();
  Timer? _debounce;
  String _query = '';
  final List<_CartLine> _cart = [];
  String? _methodCode;
  String? _clientId;
  bool _saving = false;

  static final _money = NumberFormat.currency(
    locale: 'es_VE',
    symbol: r'$',
    decimalDigits: 2,
  );

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _amount.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  double get _subtotal => _cart.fold(
        0,
        (sum, line) => sum + line.product.salePriceUSD * line.quantity,
      );

  double get _tax => _cart.fold(
        0,
        (sum, line) =>
            sum +
            line.product.salePriceUSD *
                line.quantity *
                line.product.taxRate /
                100,
      );

  double get _total => _subtotal + _tax;

  void _add(ProductSummary product) {
    final index =
        _cart.indexWhere((line) => line.product.id == product.id);
    setState(() {
      if (index >= 0) {
        _cart[index].quantity += 1;
      } else {
        _cart.add(_CartLine(product, 1));
      }
      _search.clear();
      _query = '';
    });
    _syncAmount();
  }

  void _changeQuantity(_CartLine line, double delta) {
    setState(() {
      line.quantity += delta;
      if (line.quantity <= 0) _cart.remove(line);
    });
    _syncAmount();
  }

  void _syncAmount() {
    final rates = ref.read(ratesProvider).valueOrNull;
    final options = ref.read(paymentOptionsProvider).valueOrNull;
    final method = _selectedMethod(options);
    if (method == null) return;

    final converted = _convert(_total, method.currency, rates);
    _amount.text = converted.toStringAsFixed(2);
  }

  PaymentOption? _selectedMethod(List<PaymentOption>? options) {
    if (options == null || options.isEmpty) return null;
    final code = _methodCode;
    if (code == null) return options.first;
    for (final option in options) {
      if (option.code == code) return option;
    }
    return options.first;
  }

  double _convert(double totalUSD, String currency, RatesSnapshot? rates) {
    if (currency == 'USD' || rates == null) return _round(totalUSD);
    if (currency == 'VES') return _round(totalUSD * rates.rateBcv);
    final usdt = rates.rateUsdt == 0 ? 1 : rates.rateUsdt;
    return _round(totalUSD * rates.rateBcv / usdt);
  }

  static double _round(double value) =>
      (value * 100).roundToDouble() / 100;

  Future<void> _submit(PaymentOption method) async {
    if (_cart.isEmpty) {
      _toast('Agregá al menos un producto.');
      return;
    }

    final amount = double.tryParse(_amount.text.replaceAll(',', '.'));
    if (amount == null || amount <= 0) {
      _toast('Revisá el monto a cobrar.');
      return;
    }

    setState(() => _saving = true);
    try {
      final data = await ref.read(posApiProvider).createSale({
        'items': [
          for (final line in _cart)
            {
              'productId': line.product.id,
              'productName': line.product.name,
              'quantity': line.quantity,
              'unitPriceUSD': line.product.salePriceUSD,
              'taxRate': line.product.taxRate,
            },
        ],
        'payments': [
          {
            'amountOriginal': amount,
            'currency': method.currency,
            'paymentMethod': method.code,
          },
        ],
        if (_clientId != null) 'clientId': _clientId,
      });

      final saleNumber = '${data['saleNumber'] ?? ''}';
      if (!mounted) return;
      setState(() {
        _cart.clear();
        _clientId = null;
        _amount.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            saleNumber.isEmpty ? 'Venta registrada.' : 'Venta $saleNumber registrada.',
          ),
        ),
      );
    } on ApiException catch (error) {
      _toast(error.message);
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(paymentOptionsProvider);
    final clients = ref.watch(clientsProvider(''));
    final results = _query.isEmpty ? null : ref.watch(productsProvider(_query));
    final method = _selectedMethod(options.valueOrNull);
    final theme = Theme.of(context);

    // Keep the collected amount in sync with the cart, the rates and the
    // method list (all three load asynchronously).
    ref.listen(ratesProvider, (_, _) => _syncAmount());
    ref.listen(paymentOptionsProvider, (_, _) => _syncAmount());

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            key: const Key('pos-search'),
            controller: _search,
            onChanged: _onChanged,
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Buscar producto para vender',
              prefixIcon: Icon(Icons.search),
            ),
          ),
        ),
        if (results != null)
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 200),
            child: results.when(
              loading: () => const LinearProgressIndicator(minHeight: 2),
              error: (error, _) => Padding(
                padding: const EdgeInsets.all(12),
                child: Text('$error'),
              ),
              data: (page) {
                if (page.isEmpty) {
                  return const EmptyState(
                    message: 'Nada coincide.',
                    icon: Icons.search_off,
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  itemCount: page.items.length,
                  itemBuilder: (context, index) {
                    final product = page.items[index];
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.inventory_2_outlined),
                      title: Text(product.name),
                      subtitle: Text(_money.format(product.salePriceUSD)),
                      trailing: const Icon(Icons.add_circle_outline),
                      onTap: () => _add(product),
                    );
                  },
                );
              },
            ),
          ),
        Expanded(
          child: _cart.isEmpty
              ? const EmptyState(
                  message: 'Carrito vacío. Buscá un producto para empezar.',
                  icon: Icons.shopping_basket_outlined,
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  itemCount: _cart.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final line = _cart[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(line.product.name),
                      subtitle: Text(
                        '${_money.format(line.product.salePriceUSD)} · '
                        '${_money.format(line.product.salePriceUSD * line.quantity)}',
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            onPressed: () => _changeQuantity(line, -1),
                            icon: const Icon(Icons.remove_circle_outline),
                          ),
                          Text(
                            _plain(line.quantity),
                            style: const TextStyle(
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _changeQuantity(line, 1),
                            icon: const Icon(Icons.add_circle_outline),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total'),
                        Text(
                          _money.format(_total),
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: options.when(
                            loading: () => const LinearProgressIndicator(
                              minHeight: 2,
                            ),
                            error: (error, _) => Text('$error'),
                            data: (list) => DropdownButtonFormField<String>(
                              initialValue: method?.code,
                              isDense: true,
                              decoration:
                                  const InputDecoration(labelText: 'Cobro'),
                              items: [
                                for (final option in list)
                                  DropdownMenuItem(
                                    value: option.code,
                                    child: Text(option.label),
                                  ),
                              ],
                              onChanged: (value) {
                                setState(() => _methodCode = value);
                                _syncAmount();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _amount,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: InputDecoration(
                              labelText: 'Monto ${method?.currency ?? ''}',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    clients.when(
                      loading: () => const SizedBox.shrink(),
                      error: (_, _) => const SizedBox.shrink(),
                      data: (page) => DropdownButtonFormField<String?>(
                        initialValue: _clientId,
                        isDense: true,
                        decoration:
                            const InputDecoration(labelText: 'Cliente (opcional)'),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('Sin cliente'),
                          ),
                          for (final client in page.items)
                            DropdownMenuItem<String?>(
                              value: client.id,
                              child: Text(client.name),
                            ),
                        ],
                        onChanged: (value) => setState(() => _clientId = value),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      key: const Key('pos-submit'),
                      onPressed: (_saving || method == null)
                          ? null
                          : () => _submit(method),
                      icon: _saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.point_of_sale),
                      label: const Text('Cobrar y registrar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  static String _plain(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}
