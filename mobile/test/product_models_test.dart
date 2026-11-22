import 'package:flutter_test/flutter_test.dart';
import 'package:socius_mobile/src/features/inventory/data/product_models.dart';

void main() {
  group('ProductSummary', () {
    test('parses decimals serialized as strings', () {
      final product = ProductSummary.fromJson({
        'id': 'p-1',
        'name': 'Harina PAN',
        'sku': 'PAN-1KG',
        'barcode': '7591001',
        'salePriceUSD': '1.20',
        'stock': '8.00',
        'minStock': '5.00',
        'unit': 'UND',
        'status': 'ACTIVE',
        'category': {'id': 'c-1', 'name': 'Víveres'},
      });

      expect(product.salePriceUSD, 1.2);
      expect(product.stock, 8);
      expect(product.categoryName, 'Víveres');
      expect(product.isLowStock, isFalse);
      expect(product.isActive, isTrue);
    });

    test('flags low stock at or below the minimum', () {
      final product = ProductSummary.fromJson({
        'id': 'p-1',
        'name': 'Harina PAN',
        'sku': 'PAN-1KG',
        'salePriceUSD': 1.2,
        'stock': 5,
        'minStock': 5,
        'status': 'ACTIVE',
      });

      expect(product.isLowStock, isTrue);
    });

    test('never flags a service as low stock', () {
      final product = ProductSummary.fromJson({
        'id': 'p-1',
        'name': 'Entrega',
        'sku': 'SRV-1',
        'stock': 0,
        'minStock': 0,
        'isService': true,
      });

      expect(product.isLowStock, isFalse);
    });

    test('only renders absolute image URLs', () {
      final key = ProductSummary.fromJson({
        'id': 'p-1',
        'name': 'Harina PAN',
        'sku': 'PAN-1KG',
        'imageUrl': 'products/p-1/photo.webp',
      });
      final url = ProductSummary.fromJson({
        'id': 'p-1',
        'name': 'Harina PAN',
        'sku': 'PAN-1KG',
        'imageUrl': 'https://cdn.socius.test/p-1.webp',
      });

      expect(key.hasRenderableImage, isFalse);
      expect(url.hasRenderableImage, isTrue);
    });
  });

  group('ProductPage', () {
    test('reads the paginated envelope', () {
      final page = ProductPage.fromJson({
        'list': [
          {'id': 'p-1', 'name': 'Harina PAN', 'sku': 'PAN-1KG'},
          {'id': 'p-2', 'name': 'Arroz', 'sku': 'ARR-1KG'},
        ],
        'total': 12,
        'currentPage': 2,
        'totalPages': 3,
      });

      expect(page.items, hasLength(2));
      expect(page.total, 12);
      expect(page.page, 2);
      expect(page.totalPages, 3);
      expect(page.isEmpty, isFalse);
    });

    test('tolerates an empty envelope', () {
      final page = ProductPage.fromJson({'list': []});
      expect(page.isEmpty, isTrue);
      expect(page.total, 0);
    });
  });
}
