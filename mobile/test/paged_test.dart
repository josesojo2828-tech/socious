import 'package:flutter_test/flutter_test.dart';
import 'package:socius_mobile/src/core/api/paged.dart';

class _Item {
  const _Item(this.name);

  final String name;

  static _Item fromJson(Map<String, dynamic> json) =>
      _Item('${json['name']}');
}

void main() {
  group('Paged.parse', () {
    test('reads the paginated envelope', () {
      final page = Paged.parse(
        {
          'list': [
            {'name': 'uno'},
            {'name': 'dos'},
          ],
          'total': 42,
          'currentPage': 2,
          'totalPages': 5,
        },
        _Item.fromJson,
      );

      expect(page.items.map((item) => item.name), ['uno', 'dos']);
      expect(page.total, 42);
      expect(page.page, 2);
      expect(page.totalPages, 5);
    });

    test('accepts a bare array', () {
      final page = Paged.parse([
        {'name': 'uno'},
      ], _Item.fromJson);

      expect(page.items, hasLength(1));
      expect(page.total, 1);
      expect(page.totalPages, 1);
    });

    test('tolerates a payload without a list key', () {
      final page = Paged.parse({'total': 0}, _Item.fromJson);
      expect(page.isEmpty, isTrue);
      expect(page.total, 0);
    });
  });

  group('toDouble', () {
    test('parses numbers and numeric strings', () {
      expect(toDouble(3), 3);
      expect(toDouble('2.50'), 2.5);
      expect(toDouble(null), 0);
      expect(toDouble('no-es-numero'), 0);
    });
  });
}
