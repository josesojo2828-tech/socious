import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemeProvider extends ChangeNotifier {
  static const String _themeModeKey = 'theme_mode';
  final FlutterSecureStorage _storage;

  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  bool get isDarkMode => _themeMode == ThemeMode.dark;

  ThemeProvider({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage() {
    loadThemeMode();
  }

  Future<void> loadThemeMode() async {
    try {
      final savedTheme = await _storage.read(key: _themeModeKey);
      if (savedTheme != null) {
        switch (savedTheme) {
          case 'light':
            _themeMode = ThemeMode.light;
            break;
          case 'dark':
            _themeMode = ThemeMode.dark;
            break;
          case 'system':
          default:
            _themeMode = ThemeMode.system;
            break;
        }
        notifyListeners();
      }
    } catch (_) {
      // Default to system on error
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    try {
      await _storage.write(key: _themeModeKey, value: mode.name);
    } catch (_) {}
  }

  Future<void> toggleTheme(BuildContext context) async {
    final currentBrightness = Theme.of(context).brightness;
    if (_themeMode == ThemeMode.system) {
      final newMode = currentBrightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark;
      await setThemeMode(newMode);
    } else if (_themeMode == ThemeMode.dark) {
      await setThemeMode(ThemeMode.light);
    } else {
      await setThemeMode(ThemeMode.dark);
    }
  }
}
