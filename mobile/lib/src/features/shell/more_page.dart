import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../clients/clients_page.dart';
import '../settings/settings_page.dart';
import '../suppliers/suppliers_page.dart';

/// Profile, workspace switcher and sign out.
class MorePage extends ConsumerWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final theme = Theme.of(context);
    final user = auth.user;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
              child: Text(user?.initials ?? '?'),
            ),
            title: Text(user?.displayName ?? 'Sin sesión'),
            subtitle: Text(user?.email ?? ''),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.people_outline),
                title: const Text('Clientes'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ClientsPage()),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.local_shipping_outlined),
                title: const Text('Proveedores'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SuppliersPage()),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.settings_outlined),
                title: const Text('Configuración'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsPage()),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text('Espacios', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        if (auth.workspaces.isEmpty)
          const Card(
            child: ListTile(
              leading: Icon(Icons.info_outline),
              title: Text('No tenés espacios activos'),
              subtitle: Text('Pedí una invitación al administrador.'),
            ),
          )
        else
          Card(
            child: Column(
              children: [
                for (final workspace in auth.workspaces)
                  ListTile(
                    selected: workspace.id == auth.workspaceId,
                    onTap: () => ref
                        .read(authControllerProvider.notifier)
                        .selectWorkspace(workspace.id),
                    leading: Icon(
                      workspace.id == auth.workspaceId
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                    ),
                    title: Text(workspace.name),
                    subtitle: Text(
                      [workspace.role, workspace.subscriptionStatus]
                          .whereType<String>()
                          .where((value) => value.isNotEmpty)
                          .join(' · '),
                    ),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
          icon: const Icon(Icons.logout),
          label: const Text('Cerrar sesión'),
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            'Socius · 0.1.0',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}
