import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';

class CategoryOption {
  const CategoryOption({required this.id, required this.name, this.depth = 0});

  final String id;
  final String name;
  final int depth;

  String get label => '${'· ' * depth}$name';
}

class CategoriesApi {
  CategoriesApi(this._client);

  final ApiClient _client;

  /// `GET /api/categories/mine` answers the tree; the picker wants it flat.
  Future<List<CategoryOption>> options() async {
    final data = await _client.get<List<dynamic>>('/api/categories/mine');
    return _flatten(data);
  }

  Future<void> create(String name, {String? parentId}) async {
    await _client.post<dynamic>(
      '/api/categories',
      body: {
        'name': name.trim(),
        if (parentId != null && parentId.isNotEmpty) 'parentId': parentId,
      },
    );
  }

  static List<CategoryOption> _flatten(List<dynamic> roots) {
    final result = <CategoryOption>[];

    void walk(dynamic node, int depth) {
      if (node is! Map<String, dynamic>) return;
      final id = node['id'];
      final name = node['name'];
      if (id != null && name != null) {
        result.add(
          CategoryOption(id: '$id', name: '$name', depth: depth),
        );
      }

      final children = node['subCategories'];
      if (children is List) {
        for (final child in children) {
          walk(child, depth + 1);
        }
      }
    }

    for (final root in roots) {
      walk(root, 0);
    }
    return result;
  }
}

final categoriesApiProvider = Provider<CategoriesApi>((ref) {
  return CategoriesApi(ref.watch(apiClientProvider));
});

final categoryOptionsProvider =
    FutureProvider.autoDispose<List<CategoryOption>>((ref) {
  return ref.watch(categoriesApiProvider).options();
});
