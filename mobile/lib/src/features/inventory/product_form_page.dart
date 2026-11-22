import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import 'data/categories_api.dart';
import 'data/inventory_api.dart';
import 'data/product_models.dart';

class ProductFormPage extends ConsumerStatefulWidget {
  const ProductFormPage({super.key, this.initial});

  /// `null` creates; a product edits it with PATCH semantics.
  final ProductSummary? initial;

  @override
  ConsumerState<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends ConsumerState<ProductFormPage> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _sku;
  late final TextEditingController _barcode;
  late final TextEditingController _salePrice;
  late final TextEditingController _costPrice;
  late final TextEditingController _stock;
  late final TextEditingController _minStock;
  late final TextEditingController _taxRate;
  late String _unit;
  late bool _isService;
  late bool _isPublic;
  String? _categoryId;
  bool _saving = false;
  String? _error;

  static const _units = ['UND', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'CAJA'];

  bool get _isEdit => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _name = TextEditingController(text: initial?.name ?? '');
    _sku = TextEditingController(text: initial?.sku ?? '');
    _barcode = TextEditingController(text: initial?.barcode ?? '');
    _salePrice = TextEditingController(
      text: initial == null ? '' : _plain(initial.salePriceUSD),
    );
    _costPrice = TextEditingController();
    _stock = TextEditingController(
      text: initial == null ? '' : _plain(initial.stock),
    );
    _minStock = TextEditingController(
      text: initial == null ? '' : _plain(initial.minStock),
    );
    _taxRate = TextEditingController(
      text: initial == null ? '' : _plain(initial.taxRate),
    );
    _unit = _units.contains(initial?.unit) ? initial!.unit : 'UND';
    _isService = initial?.isService ?? false;
    _isPublic = false;
  }

  static String _plain(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _sku,
      _barcode,
      _salePrice,
      _costPrice,
      _stock,
      _minStock,
      _taxRate,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  double? _number(TextEditingController controller) {
    final text = controller.text.trim();
    if (text.isEmpty) return null;
    return double.tryParse(text.replaceAll(',', '.'));
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _error = null;
    });

    final body = <String, dynamic>{
      'name': _name.text.trim(),
      if (_sku.text.trim().isNotEmpty) 'sku': _sku.text.trim(),
      if (_barcode.text.trim().isNotEmpty) 'barcode': _barcode.text.trim(),
      'salePriceUSD': _number(_salePrice) ?? 0,
      'costPriceUSD': _number(_costPrice) ?? 0,
      'minStock': _number(_minStock) ?? 0,
      'taxRate': _number(_taxRate) ?? 0,
      'unit': _unit,
      'isService': _isService,
      'isPublic': _isPublic,
      if (!_isService) 'stock': _number(_stock) ?? 0,
      if (_categoryId != null) 'categoryId': _categoryId,
    };

    try {
      final api = ref.read(inventoryApiProvider);
      if (_isEdit) {
        await api.update(widget.initial!.id, body);
      } else {
        await api.create(body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      setState(() {
        _saving = false;
        _error = error.message;
      });
    } catch (error) {
      setState(() {
        _saving = false;
        _error = '$error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoryOptionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Editar producto' : 'Nuevo producto'),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              key: const Key('product-name'),
              controller: _name,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty)
                      ? 'El nombre es obligatorio.'
                      : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _sku,
                    decoration: const InputDecoration(labelText: 'SKU'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _barcode,
                    decoration:
                        const InputDecoration(labelText: 'Código de barras'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _salePrice,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration:
                        const InputDecoration(labelText: 'Precio venta USD *'),
                    validator: (value) =>
                        (_number(_salePrice) == null)
                            ? 'Poné el precio.'
                            : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _costPrice,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Costo USD'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _taxRate,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'IVA %'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _unit,
                    decoration: const InputDecoration(labelText: 'Unidad'),
                    items: [
                      for (final unit in _units)
                        DropdownMenuItem(value: unit, child: Text(unit)),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _unit = value);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            categories.when(
              loading: () => const LinearProgressIndicator(minHeight: 2),
              error: (_, _) => const SizedBox.shrink(),
              data: (options) => DropdownButtonFormField<String?>(
                initialValue: _categoryId,
                decoration: const InputDecoration(labelText: 'Categoría'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Sin categoría'),
                  ),
                  for (final option in options)
                    DropdownMenuItem<String?>(
                      value: option.id,
                      child: Text(option.label),
                    ),
                ],
                onChanged: (value) => setState(() => _categoryId = value),
              ),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Es un servicio'),
              subtitle: const Text('No controla stock.'),
              value: _isService,
              onChanged: (value) => setState(() => _isService = value),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Visible en la tienda'),
              value: _isPublic,
              onChanged: (value) => setState(() => _isPublic = value),
            ),
            if (!_isService) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _stock,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(labelText: 'Stock'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _minStock,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration:
                          const InputDecoration(labelText: 'Stock mínimo'),
                    ),
                  ),
                ],
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_isEdit ? 'Guardar cambios' : 'Crear producto'),
            ),
          ],
        ),
      ),
    );
  }
}
