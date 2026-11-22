import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/states.dart';
import 'data/suppliers_api.dart';
import 'supplier_form_page.dart';

class SuppliersPage extends ConsumerStatefulWidget {
  const SuppliersPage({super.key});

  @override
  ConsumerState<SuppliersPage> createState() => _SuppliersPageState();
}

class _SuppliersPageState extends ConsumerState<SuppliersPage> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const SupplierFormPage()),
    );
    if (created == true) ref.invalidate(suppliersProvider(_query));
  }

  @override
  Widget build(BuildContext context) {
    final suppliers = ref.watch(suppliersProvider(_query));

    return Scaffold(
      appBar: AppBar(title: const Text('Proveedores')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add_business),
        label: const Text('Proveedor'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              onSubmitted: (value) => setState(() => _query = value.trim()),
              decoration: const InputDecoration(
                hintText: 'Nombre, documento o contacto',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: suppliers.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => ErrorRetry(
                message: '$error',
                onRetry: () => ref.invalidate(suppliersProvider(_query)),
              ),
              data: (page) {
                if (page.isEmpty) {
                  return const EmptyState(
                    message: 'Todavía no hay proveedores cargados.',
                    icon: Icons.local_shipping_outlined,
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                  itemCount: page.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final supplier = page.items[index];
                    return Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.local_shipping_outlined, size: 20),
                        ),
                        title: Text(supplier.name),
                        subtitle: Text(
                          [
                            if (supplier.taxId?.isNotEmpty ?? false)
                              supplier.taxId!,
                            if (supplier.contactName?.isNotEmpty ?? false)
                              supplier.contactName!,
                            if (supplier.phone?.isNotEmpty ?? false)
                              supplier.phone!,
                          ].join(' · '),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
