import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/auth/login_page.dart';
import '../../features/auth/splash_page.dart';
import '../../features/shell/home_shell.dart';

/// Routing and the session guard.
///
/// `refreshListenable` re-evaluates [redirect] whenever the auth state changes,
/// so the app moves from splash to login or home without any manual navigation
/// from the pages.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen<AuthState>(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;
      final atSplash = location == '/splash';
      final atLogin = location == '/login';

      switch (auth.status) {
        case AuthStatus.unknown:
          return atSplash ? null : '/splash';
        case AuthStatus.unauthenticated:
          return atLogin ? null : '/login';
        case AuthStatus.authenticated:
          return (atSplash || atLogin) ? '/home' : null;
      }
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeShell(),
      ),
    ],
  );
});
