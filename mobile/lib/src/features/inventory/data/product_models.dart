/// Product rows as the API returns them (`GET /api/products`).
///
/// Prisma serializes `Decimal` as a string, so every number is parsed through
/// [_toDouble] instead of being cast.
class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.name,
    required this.sku,
    required this.unit,
    required this.salePriceUSD,
    required this.stock,
    required this.taxRate,
    required this.minStock,
    required this.status,
    this.barcode,
    this.imageUrl,
    this.categoryName,
    this.isService = false,
    this.isRawMaterial = false,
  });

  final String id;
  final String name;
  final String sku;
  final String unit;
  final double salePriceUSD;
  final double stock;
  final double taxRate;
  final double minStock;
  final String status;
  final String? barcode;
  final String? imageUrl;
  final String? categoryName;
  final bool isService;
  final bool isRawMaterial;

  bool get isActive => status == 'ACTIVE';

  bool get isLowStock => !isService && stock <= minStock;

  /// Only absolute URLs render; a MinIO key would need the file endpoint.
  bool get hasRenderableImage =>
      imageUrl != null && imageUrl!.startsWith('http');

  factory ProductSummary.fromJson(Map<String, dynamic> json) {
    final category = json['category'];
    return ProductSummary(
      id: '${json['id']}',
      name: '${json['name'] ?? 'Sin nombre'}',
      sku: '${json['sku'] ?? ''}',
      unit: '${json['unit'] ?? 'UND'}',
      salePriceUSD: _toDouble(json['salePriceUSD']),
      stock: _toDouble(json['stock']),
      taxRate: _toDouble(json['taxRate']),
      minStock: _toDouble(json['minStock']),
      status: '${json['status'] ?? 'ACTIVE'}',
      barcode: json['barcode'] as String?,
      imageUrl: json['imageUrl'] as String?,
      categoryName: category is Map ? category['name'] as String? : null,
      isService: json['isService'] == true,
      isRawMaterial: json['isRawMaterial'] == true,
    );
  }
}

class ProductPage {
  const ProductPage({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  final List<ProductSummary> items;
  final int total;
  final int page;
  final int totalPages;

  bool get isEmpty => items.isEmpty;

  factory ProductPage.fromJson(Map<String, dynamic> json) {
    final raw = json['list'];
    final items = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(ProductSummary.fromJson)
            .toList()
        : <ProductSummary>[];

    return ProductPage(
      items: items,
      total: _toInt(json['total']) ?? items.length,
      page: _toInt(json['currentPage']) ?? 1,
      totalPages: _toInt(json['totalPages']) ?? 1,
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

int? _toInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse('${value ?? ''}');
}
