/// Envelope shared by the paginated list endpoints
/// (`{ list, total, currentPage, totalPages }`).
///
/// Some endpoints answer a bare array instead of the envelope; both are
/// accepted so a controller change never crashes a screen.
class Paged<T> {
  const Paged({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  final List<T> items;
  final int total;
  final int page;
  final int totalPages;

  bool get isEmpty => items.isEmpty;

  static Paged<T> parse<T>(
    dynamic payload,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (payload is List) {
      final items = payload
          .whereType<Map<String, dynamic>>()
          .map(fromJson)
          .toList(growable: false);
      return Paged(
        items: items,
        total: items.length,
        page: 1,
        totalPages: 1,
      );
    }

    if (payload is! Map) {
      return const Paged(items: [], total: 0, page: 1, totalPages: 1);
    }

    final raw = payload['list'];
    final items = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(fromJson)
            .toList(growable: false)
        : <T>[];

    return Paged(
      items: items,
      total: _toInt(payload['total']) ?? items.length,
      page: _toInt(payload['currentPage']) ?? 1,
      totalPages: _toInt(payload['totalPages']) ?? 1,
    );
  }
}

double toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

int? _toInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse('${value ?? ''}');
}
