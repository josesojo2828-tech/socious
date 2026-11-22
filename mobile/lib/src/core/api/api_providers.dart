import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/token_storage.dart';
import 'api_client.dart';

/// Shared HTTP infrastructure. Features depend on these, never on each other,
/// so the auth controller and the rest of the app build the same client.
final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(storage: ref.watch(tokenStorageProvider));
});
