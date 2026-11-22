import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/api/paged.dart';

class PurchaseSummary {
  const PurchaseSummary({
    required this.id,
    required this.purchaseNumber,
    required this.status,
    required this.totalUSD,
    this.supplierName,
    this.issueDate,
    this.itemsCount = 0,
  });

  final String id;
  final String purchaseNumber;
  final String status;
  final double totalUSD;
  final String? supplierName;
  final DateTime? issueDate;
  final int itemsCount;

  bool get isPending => status == 'PENDING';

  factory PurchaseSummary.fromJson(Map<String, dynamic> json) {
    final supplier = json['supplier'];
    final items = json['items'];
    return PurchaseSummary(
      id: '${json['id']}',
      purchaseNumber: '${json['purchaseNumber'] ?? ''}',
      status: '${json['status'] ?? 'PENDING'}',
      totalUSD: toDouble(json['totalUSD']),
      supplierName: supplier is Map ? supplier['name'] as String? : null,
      issueDate: DateTime.tryParse('${json['issueDate'] ?? ''}'),
      itemsCount: items is List ? items.length : 0,
    );
  }
}

class PurchaseItem {
  const PurchaseItem({
    required this.productName,
    required this.quantity,
    required this.totalUSD,
  });

  final String productName;
  final double quantity;
  final double totalUSD;

  factory PurchaseItem.fromJson(Map<String, dynamic> json) => PurchaseItem(
        productName: '${json['productName'] ?? 'Producto'}',
        quantity: toDouble(json['quantity']),
        totalUSD: toDouble(json['totalUSD']),
      );
}

class PurchaseDetail {
  const PurchaseDetail({
    required this.summary,
    required this.items,
    this.notes,
  });

  final PurchaseSummary summary;
  final List<PurchaseItem> items;
  final String? notes;

  factory PurchaseDetail.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return PurchaseDetail(
      summary: PurchaseSummary.fromJson(json),
      items: rawItems is List
          ? rawItems
              .whereType<Map<String, dynamic>>()
              .map(PurchaseItem.fromJson)
              .toList()
          : const [],
      notes: json['notes'] as String?,
    );
  }
}

class PurchasesApi {
  PurchasesApi(this._client);

  final ApiClient _client;

  Future<Paged<PurchaseSummary>> search({
    String? q,
    int page = 1,
    int limit = 30,
  }) async {
    final data = await _client.get<Map<String, dynamic>>(
      '/api/purchases',
      query: {
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'page': page,
        'limit': limit,
      },
    );
    return Paged.parse(data, PurchaseSummary.fromJson);
  }

  Future<PurchaseDetail> byId(String id) async {
    final data = await _client.get<Map<String, dynamic>>('/api/purchases/$id');
    return PurchaseDetail.fromJson(data);
  }

  Future<void> receive(String id) async {
    await _client.post<dynamic>('/api/purchases/$id/receive');
  }
}

final purchasesApiProvider = Provider<PurchasesApi>((ref) {
  return PurchasesApi(ref.watch(apiClientProvider));
});

final purchasesProvider = FutureProvider.autoDispose
    .family<Paged<PurchaseSummary>, String>((ref, query) {
  return ref.watch(purchasesApiProvider).search(q: query);
});

final purchaseProvider = FutureProvider.autoDispose
    .family<PurchaseDetail, String>((ref, id) {
  return ref.watch(purchasesApiProvider).byId(id);
});
