import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import 'data/suppliers_api.dart';

class SupplierFormPage extends ConsumerStatefulWidget {
  const SupplierFormPage({super.key, this.initial});

  /// `null` crea; un proveedor se edita.
  final SupplierSummary? initial;

  @override
  ConsumerState<SupplierFormPage> createState() => _SupplierFormPageState();
}

class _SupplierFormPageState extends ConsumerState<SupplierFormPage> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _taxId;
  late final TextEditingController _contactName;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _address;
  late final TextEditingController _notes;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _name = TextEditingController(text: initial?.name ?? '');
    _taxId = TextEditingController(text: initial?.taxId ?? '');
    _contactName = TextEditingController(text: initial?.contactName ?? '');
    _phone = TextEditingController(text: initial?.phone ?? '');
    _email = TextEditingController(text: initial?.email ?? '');
    _address = TextEditingController();
    _notes = TextEditingController();
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _taxId,
      _contactName,
      _phone,
      _email,
      _address,
      _notes,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _error = null;
    });

    final draft = SupplierDraft(
      name: _name.text,
      taxId: _taxId.text,
      contactName: _contactName.text,
      phone: _phone.text,
      email: _email.text,
      address: _address.text,
      notes: _notes.text,
    );

    try {
      final api = ref.read(suppliersApiProvider);
      if (_isEdit) {
        await api.update(widget.initial!.id, draft);
      } else {
        await api.create(draft);
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
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Editar proveedor' : 'Nuevo proveedor'),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty)
                      ? 'El nombre es obligatorio.'
                      : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _taxId,
              decoration: const InputDecoration(labelText: 'Documento / RIF'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _contactName,
              decoration: const InputDecoration(labelText: 'Persona de contacto'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Correo'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Dirección'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Notas'),
            ),
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
                  : Text(_isEdit ? 'Guardar cambios' : 'Guardar proveedor'),
            ),
          ],
        ),
      ),
    );
  }
}
