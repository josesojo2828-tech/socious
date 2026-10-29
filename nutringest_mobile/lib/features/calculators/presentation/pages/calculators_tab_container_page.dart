import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/app_drawer.dart';
import 'tmb_get_calculator_page.dart';
import 'food_waste_calculator_page.dart';

class CalculatorsTabContainerPage extends StatefulWidget {
  final int initialIndex;

  const CalculatorsTabContainerPage({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<CalculatorsTabContainerPage> createState() => _CalculatorsTabContainerPageState();
}

class _CalculatorsTabContainerPageState extends State<CalculatorsTabContainerPage> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DefaultTabController(
      length: 2,
      initialIndex: widget.initialIndex,
      child: Scaffold(
        drawer: const AppDrawer(currentTabIndex: 1),
        appBar: AppBar(
          title: Text(
            'Calculadoras Nutricionales',
            style: GoogleFonts.montserrat(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottom: TabBar(
            indicatorColor: AppTheme.primaryPurple,
            indicatorWeight: 3,
            labelColor: AppTheme.primaryPurple,
            unselectedLabelColor: isDark ? AppTheme.textSecondaryDark : AppTheme.textSecondaryLight,
            labelStyle: GoogleFonts.montserrat(
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
            unselectedLabelStyle: GoogleFonts.montserrat(
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            tabs: const [
              Tab(
                icon: Icon(Icons.calculate_outlined, size: 20),
                text: 'TMB & GET',
              ),
              Tab(
                icon: Icon(Icons.pie_chart_outline, size: 20),
                text: 'Mermas & Rendimiento',
              ),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            TmbGetCalculatorPage(hideAppBar: true),
            FoodWasteCalculatorPage(hideAppBar: true),
          ],
        ),
      ),
    );
  }
}
