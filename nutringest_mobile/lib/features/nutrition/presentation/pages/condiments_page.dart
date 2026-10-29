import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/main_navigation_shell.dart';
import '../../services/nutrition_service.dart';

class CondimentsPage extends StatefulWidget {
  const CondimentsPage({super.key});

  @override
  State<CondimentsPage> createState() => _CondimentsPageState();
}

class _CondimentsPageState extends State<CondimentsPage> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();

  String _searchQuery = '';
  int _currentPage = 1;
  int _totalPages = 1;
  static const int _limit = 10;

  bool _isLoading = true;
  bool _hasLoadedFromApi = false;
  List<Map<String, dynamic>> _apiCondiments = [];
  Timer? _debounceTimer;

  static const List<Map<String, String>> sampleCondiments = [
    {
      'name': 'Canela en polvo',
      'type': 'Especia',
      'portion': 'Libre consumo (1 cdta)',
      'notes': 'Sin sodio ni calorías significativas. Ideal para infuso y desayunos.',
      'kcal': '0-5 kcal',
    },
    {
      'name': 'Orégano seco',
      'type': 'Hierba aromática',
      'portion': 'Libre consumo',
      'notes': 'Aporta antioxidantes y realza sabor en ensaladas y salsas.',
      'kcal': '0 kcal',
    },
    {
      'name': 'Pimienta negra molida',
      'type': 'Especia',
      'portion': 'Al gusto',
      'notes': 'Estimula digestión. Sin carbohidratos netos.',
      'kcal': '0 kcal',
    },
    {
      'name': 'Jengibre fresco rallado',
      'type': 'Raíz / Especia',
      'portion': '1 cdta (5g)',
      'notes': 'Propiedades antiinflamatorias y digestivas.',
      'kcal': '4 kcal',
    },
    {
      'name': 'Vinagre de manzana / blanco',
      'type': 'Aderezo Libre',
      'portion': '1-2 cdas (15-30ml)',
      'notes': 'Apto para aderezar verduras sin sumar lípidos.',
      'kcal': '3 kcal',
    },
    {
      'name': 'Jugo de limón natural',
      'type': 'Cítrico / Libre',
      'portion': '2 cdas (30ml)',
      'notes': 'Rico en Vitamina C, potencia absorción de hierro no hemo.',
      'kcal': '8 kcal',
    },
    {
      'name': 'Ajo en polvo / machacado',
      'type': 'Condimento',
      'portion': '1 diente o 1/2 cdta',
      'notes': 'Cardioprotector natural. Libre uso culinario.',
      'kcal': '4 kcal',
    },
    {
      'name': 'Mostaza dijon (sin azúcar)',
      'type': 'Aderezo bajo en kcal',
      'portion': '1 cdta (5g)',
      'notes': 'Verificar contenido de sodio en hipertensos.',
      'kcal': '5 kcal',
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchCondiments(page: 1);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchCondiments({int page = 1}) async {
    debugPrint('[CONDIMENTS_PAGE] Load start: page $page, query: "$_searchQuery"');
    setState(() => _isLoading = true);
    try {
      final res = await _nutritionService.getCondimentsPaginated(
        page: page,
        limit: _limit,
        q: _searchQuery,
      );

      debugPrint('[CONDIMENTS_PAGE] Data received: ${res.items.length} condiments (page: ${res.currentPage}/${res.totalPages}, total: ${res.total})');
      if (mounted) {
        setState(() {
          _apiCondiments = res.items;
          _currentPage = res.currentPage;
          _totalPages = res.totalPages;
          _hasLoadedFromApi = true;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('[CONDIMENTS_PAGE] Catch block error loading condiments: $e\n$stack');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      setState(() {
        _searchQuery = val;
        _currentPage = 1;
      });
      _fetchCondiments(page: 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final useApi = _hasLoadedFromApi;

    // Fallback filtered in case API fails
    final List<Map<String, String>> localFiltered = sampleCondiments.where((item) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return (item['name'] ?? '').toLowerCase().contains(q) ||
          (item['type'] ?? '').toLowerCase().contains(q) ||
          (item['notes'] ?? '').toLowerCase().contains(q);
    }).toList();

    final localTotalPages = ((localFiltered.length / _limit).ceil()).clamp(1, 9999);
    final effectiveTotalPages = useApi ? _totalPages : localTotalPages;
    final startIndex = (_currentPage - 1) * _limit;
    final endIndex = (startIndex + _limit).clamp(0, localFiltered.length);
    final paginatedLocal = startIndex < localFiltered.length
        ? localFiltered.sublist(startIndex, endIndex)
        : <Map<String, String>>[];

    final totalDisplayItems = useApi ? _apiCondiments.length : paginatedLocal.length;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              MainNavigationShellScope.of(context)?.selectTab(2);
              Navigator.of(context).popUntil((route) => route.isFirst);
            }
          },
        ),
        title: Text(
          'Condimentos & Libre Consumo',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
            child: Row(
              children: [
                const Icon(Icons.grain_rounded, color: AppTheme.primaryPurple, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Catálogo de especias, hierbas y sazonadores de libre consumo autorizados para enriquecer el sabor de las preparaciones sin impactar la carga calórica.',
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar condimento, especia o hierba...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.primaryPurple),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.borderLight),
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryPurple))
                : totalDisplayItems == 0
                    ? Center(
                        child: Text(
                          'No se encontraron condimentos.',
                          style: GoogleFonts.montserrat(color: AppTheme.textSecondaryLight),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: totalDisplayItems,
                        itemBuilder: (context, index) {
                          final Map<String, dynamic> item = useApi
                              ? _apiCondiments[index]
                              : paginatedLocal[index];

                          final name = item['name']?.toString() ?? 'Condimento';
                          final kcal = item['kcal']?.toString() ?? '0 kcal';
                          final type = item['type']?.toString() ?? 'Condimento / Libre';
                          final portion = item['portion']?.toString() ?? 'Libre consumo';
                          final notes = item['notes']?.toString() ?? 'Sin aporte calórico relevante.';

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.spa_rounded,
                                      color: AppTheme.primaryPurple,
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                name,
                                                style: GoogleFonts.montserrat(
                                                  fontSize: 14.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: theme.colorScheme.onSurface,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppTheme.successGreen.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                kcal,
                                                style: GoogleFonts.montserrat(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppTheme.successGreen,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '$type • Porción: $portion',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 12,
                                            color: AppTheme.textSecondaryLight,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          notes,
                                          style: GoogleFonts.montserrat(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w500,
                                            color: theme.colorScheme.onSurface,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Controles explícitos de paginación (10 por página, sin scroll infinito)
          if (!_isLoading && totalDisplayItems > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
              child: _buildPaginationBar(context, effectiveTotalPages, isDark),
            ),
        ],
      ),
    );
  }

  Widget _buildPaginationBar(BuildContext context, int totalPages, bool isDark) {
    final hasPrev = _currentPage > 1;
    final hasNext = _currentPage < totalPages;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: OutlinedButton(
              onPressed: hasPrev
                  ? () {
                      setState(() => _currentPage--);
                      _fetchCondiments(page: _currentPage);
                    }
                  : null,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.primaryPurple,
                disabledForegroundColor: Colors.grey,
                minimumSize: const Size(32, 36),
                side: BorderSide(
                  color: hasPrev
                      ? AppTheme.primaryPurple.withValues(alpha: 0.4)
                      : Colors.grey.withValues(alpha: 0.2),
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.chevron_left_rounded, size: 16),
                  const SizedBox(width: 2),
                  Flexible(
                    child: Text(
                      'Anterior',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primaryPurple.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Página $_currentPage de ${totalPages < 1 ? 1 : totalPages}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.montserrat(
                fontSize: 11.5,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryPurple,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: ElevatedButton(
              onPressed: hasNext
                  ? () {
                      setState(() => _currentPage++);
                      _fetchCondiments(page: _currentPage);
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryPurple,
                foregroundColor: Colors.white,
                minimumSize: const Size(32, 36),
                disabledBackgroundColor: isDark ? Colors.grey[800] : Colors.grey[300],
                disabledForegroundColor: Colors.grey[500],
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      'Siguiente',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right_rounded, size: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
