import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../shared/widgets/states.dart';
import 'data/categories_api.dart';

class CategoriesPage extends ConsumerWidget {
  const CategoriesPage({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Nueva categoría'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Nombre'),
          onSubmitted: (value) => Navigator.of(dialogContext).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text),
            child: const Text('Crear'),
          ),
        ],
      ),
    );

    if (name == null || name.trim().isEmpty) return;

    try {
      await ref.read(categoriesApiProvider).create(name);
      ref.invalidate(categoryOptionsProvider);
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoryOptionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Categorías')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _create(context, ref),
        child: const Icon(Icons.add),
      ),
      body: categories.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: '$error',
          onRetry: () => ref.invalidate(categoryOptionsProvider),
        ),
        data: (options) {
          if (options.isEmpty) {
            return const EmptyState(
              message: 'Todavía no hay categorías.',
              icon: Icons.category_outlined,
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
            itemCount: options.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final option = options[index];
              return ListTile(
                leading: const Icon(Icons.label_outline),
                title: Text(option.label),
              );
            },
          );
        },
      ),
    );
  }
}
