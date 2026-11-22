import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';
import 'product_models.dart';

class InventoryApi {
  InventoryApi(this._client);

  final ApiClient _client;

  /// `q` matches name, SKU and barcode on the server, so the scanner only has
  /// to feed the same search the keyboard uses.
  Future<ProductPage> search({
    String? q,
    int page = 1,
    int limit = 30,
  }) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/products',
      query: {
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'page': page,
        'limit': limit,
      },
    );
    return ProductPage.fromJson(data);
  }

  Future<ProductSummary> create(Map<String, dynamic> body) async {
    final data = await _client.post<Map<String, dynamic>>(
      '/api/products',
      body: body,
    );
    final payload = data['data'];
    return ProductSummary.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }

  Future<ProductSummary> update(String id, Map<String, dynamic> body) async {
    final data = await _client.patch<Map<String, dynamic>>(
      '/api/products/$id',
      body: body,
    );
    final payload = data['data'];
    return ProductSummary.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }

  Future<ProductSummary> byId(String id) async {
    final data = await _client.get<Map<String, dynamic>>('/api/products/$id');
    final payload = data['data'];
    return ProductSummary.fromJson(
      payload is Map<String, dynamic> ? payload : data,
    );
  }
}

final inventoryApiProvider = Provider<InventoryApi>((ref) {
  return InventoryApi(ref.watch(apiClientProvider));
});

final productsProvider = FutureProvider.autoDispose
    .family<ProductPage, String>((ref, query) {
  return ref.watch(inventoryApiProvider).search(q: query);
});

final productProvider = FutureProvider.autoDispose
    .family<ProductSummary, String>((ref, id) {
  return ref.watch(inventoryApiProvider).byId(id);
});
