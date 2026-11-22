import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../shared/widgets/states.dart';
import 'data/settings_api.dart';

/// The switches a merchant actually changes from the phone.
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _saving = false;

  Future<void> _patch(Map<String, dynamic> patch) async {
    setState(() => _saving = true);
    try {
      await ref.read(settingsApiProvider).update(patch);
      ref.invalidate(tenantSettingsProvider);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(tenantSettingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración'),
        bottom: _saving
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: settings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: '$error',
          onRetry: () => ref.invalidate(tenantSettingsProvider),
        ),
        data: (value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _SectionTitle('Caja'),
            Card(
              child: SwitchListTile(
                title: const Text('Control de turnos'),
                subtitle: const Text(
                  'La venta se ata a un turno de caja abierto.',
                ),
                value: value.shiftControl,
                onChanged: (next) =>
                    _patch({'cash': {'shiftControl': next}}),
              ),
            ),
            const SizedBox(height: 16),
            _SectionTitle('Monedas visibles'),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('USD'),
                    value: value.showUSD,
                    onChanged: (next) =>
                        _patch({'currencies': {'showUSD': next}}),
                  ),
                  SwitchListTile(
                    title: const Text('Bs (VES)'),
                    value: value.showVES,
                    onChanged: (next) =>
                        _patch({'currencies': {'showVES': next}}),
                  ),
                  SwitchListTile(
                    title: const Text('USDT'),
                    value: value.showUSDT,
                    onChanged: (next) =>
                        _patch({'currencies': {'showUSDT': next}}),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _SectionTitle('Inventario'),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('Materia prima (BOM)'),
                    subtitle: const Text(
                      'Productos compuestos y componentes.',
                    ),
                    value: value.useRawMaterials,
                    onChanged: (next) =>
                        _patch({'inventory': {'useRawMaterials': next}}),
                  ),
                  SwitchListTile(
                    title: const Text('Servicios'),
                    subtitle: const Text(
                      'El negocio vende servicios además de productos.',
                    ),
                    value: value.useServices,
                    onChanged: (next) =>
                        _patch({'inventory': {'useServices': next}}),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Los cambios se guardan al instante.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
    );
  }
}
