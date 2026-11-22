import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/widgets/states.dart';
import 'client_form_page.dart';
import 'data/clients_api.dart';

class ClientsPage extends ConsumerStatefulWidget {
  const ClientsPage({super.key});

  @override
  ConsumerState<ClientsPage> createState() => _ClientsPageState();
}

class _ClientsPageState extends ConsumerState<ClientsPage> {
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
      if (mounted) setState(() => _query = value.trim());
    });
  }

  Future<void> _edit(ClientSummary client) async {
    try {
      final full = await ref.read(clientsApiProvider).byId(client.id);
      if (!mounted) return;
      final saved = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => ClientFormPage(initial: full)),
      );
      if (saved == true) ref.invalidate(clientsProvider);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const ClientFormPage()),
    );
    if (created == true) ref.invalidate(clientsProvider(_query));
  }

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(clientsProvider(_query));

    return Scaffold(
      appBar: AppBar(title: const Text('Clientes')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Cliente'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _search,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Nombre, documento o teléfono',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: clients.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => ErrorRetry(
                message: '$error',
                onRetry: () => ref.invalidate(clientsProvider(_query)),
              ),
              data: (page) {
                if (page.isEmpty) {
                  return const EmptyState(
                    message: 'Todavía no hay clientes cargados.',
                    icon: Icons.people_outline,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(clientsProvider(_query)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                    itemCount: page.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final client = page.items[index];
                      return Card(
                        child: ListTile(
                          onTap: () => _edit(client),
                          leading: CircleAvatar(
                            child: Text(_initial(client.name)),
                          ),
                          title: Text(client.name),
                          subtitle: Text(
                            [
                              if (client.taxId?.isNotEmpty ?? false)
                                client.taxId!,
                              if (client.phone?.isNotEmpty ?? false)
                                client.phone!,
                            ].join(' · '),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                _money.format(client.balanceUSD),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontFeatures: [
                                    FontFeature.tabularFigures()
                                  ],
                                ),
                              ),
                              const Text(
                                'saldo',
                                style: TextStyle(fontSize: 11),
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
      ),
    );
  }

  static String _initial(String name) {
    final trimmed = name.trim();
    return trimmed.isEmpty ? '?' : trimmed[0].toUpperCase();
  }
}
