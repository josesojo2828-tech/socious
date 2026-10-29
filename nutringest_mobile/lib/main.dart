import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/pages/splash_page.dart';
import 'features/dashboard/providers/sidebar_provider.dart';
import 'features/patients/providers/patients_provider.dart';
import 'features/clinical/providers/clinical_provider.dart';
import 'features/nutrition/providers/nutrition_provider.dart';
import 'features/calculators/providers/calculators_provider.dart';
import 'features/agenda/providers/agenda_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NutringestApp());
}

class NutringestApp extends StatelessWidget {
  const NutringestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SidebarProvider()),
        ChangeNotifierProvider(create: (_) => PatientsProvider()),
        ChangeNotifierProvider(create: (_) => ClinicalProvider()),
        ChangeNotifierProvider(create: (_) => NutritionProvider()),
        ChangeNotifierProvider(create: (_) => CalculatorsProvider()),
        ChangeNotifierProvider(create: (_) => AgendaProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'Nutringest',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            home: const SplashPage(),
          );
        },
      ),
    );
  }
}
