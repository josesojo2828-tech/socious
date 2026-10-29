import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/main_navigation_shell.dart';
import '../../models/exchange_list_model.dart';
import '../../services/nutrition_service.dart';
import 'exchange_list_page.dart';

class ExchangeFoodsPage extends StatefulWidget {
  const ExchangeFoodsPage({super.key});

  @override
  State<ExchangeFoodsPage> createState() => _ExchangeFoodsPageState();
}

class _ExchangeFoodsPageState extends State<ExchangeFoodsPage> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();

  String _searchQuery = '';
  String _selectedCategory = 'Todos';

  int _currentPage = 1;
  int _totalPages = 1;
  static const int _limit = 10;

  bool _isLoading = false;
  bool _hasLoadedFromApi = false;
  List<FoodExchangeModel> _apiFoods = [];
  Timer? _debounceTimer;

  static const List<String> categories = [
    'Todos',
    'Leche Descremada',
    'Leguminosas',
    'Verduras',
    'Frutas',
    'Cereales sin Grasa',
    'Origen Animal',
    'Grasas con Proteína',
  ];

  static const List<Map<String, String>> sampleExchangeFoods = [
    {
      'name': 'Manzana mediana',
      'category': 'Frutas',
      'portion': '1 pieza (106g)',
      'equivalents': '1/2 plátano, 1 taza de fresas, 17 uvas',
      'kcal': '60 kcal',
      'macros': 'P: 0g | G: 0g | C: 15g',
    },
    {
      'name': 'Leche descremada',
      'category': 'Leche Descremada',
      'portion': '1 taza (245ml)',
      'equivalents': '1 taza de yogur natural descremado',
      'kcal': '95 kcal',
      'macros': 'P: 9g | G: 2g | C: 12g',
    },
    {
      'name': 'Pechuga de pollo asada',
      'category': 'Origen Animal',
      'portion': '30g',
      'equivalents': '30g de filete de res, 40g de queso panela',
      'kcal': '40 kcal',
      'macros': 'P: 7g | G: 1g | C: 0g',
    },
    {
      'name': 'Tortilla de maíz',
      'category': 'Cereales sin Grasa',
      'portion': '1 pieza (30g)',
      'equivalents': '1/2 taza de avena cocida, 1 rebanada de pan integral',
      'kcal': '70 kcal',
      'macros': 'P: 2g | G: 1g | C: 15g',
    },
    {
      'name': 'Frijoles cocidos',
      'category': 'Leguminosas',
      'portion': '1/2 taza (86g)',
      'equivalents': '1/2 taza de lentejas, 1/2 taza de garbanzos',
      'kcal': '120 kcal',
      'macros': 'P: 8g | G: 1g | C: 20g',
    },
    {
      'name': 'Almendras tostadas',
      'category': 'Grasas con Proteína',
      'portion': '10 piezas (12g)',
      'equivalents': '4 mitades de nuez, 2 cdtas de mantequilla de maní',
      'kcal': '70 kcal',
      'macros': 'P: 3g | G: 5g | C: 3g',
    },
    {
      'name': 'Espinaca cruda',
      'category': 'Verduras',
      'portion': '2 tazas (60g)',
      'equivalents': '1 taza de brócoli cocido, 1/2 taza de jitomate',
      'kcal': '25 kcal',
      'macros': 'P: 2g | G: 0g | C: 4g',
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchFoods(page: 1);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchFoods({int page = 1}) async {
    debugPrint('[EXCHANGE_FOODS_PAGE] Load start: page $page, query: "$_searchQuery", category: "$_selectedCategory"');
    setState(() {
      _isLoading = true;
    });

    try {
      final res = await _nutritionService.getExchangeFoods(
        page: page,
        limit: _limit,
        q: _searchQuery,
        category: _selectedCategory == 'Todos' ? null : _selectedCategory,
      );

      debugPrint('[EXCHANGE_FOODS_PAGE] Data received: ${res.items.length} exchange foods (page: ${res.currentPage}/${res.totalPages}, total: ${res.total})');
      if (mounted) {
        setState(() {
          _apiFoods = res.items;
          _currentPage = res.currentPage;
          _totalPages = res.totalPages;
          _hasLoadedFromApi = true;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('[EXCHANGE_FOODS_PAGE] Catch block error loading exchange foods: $e\n$stack');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
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
      _fetchFoods(page: 1);
    });
  }

  void _onCategorySelected(String cat) {
    setState(() {
      _selectedCategory = cat;
      _currentPage = 1;
    });
    _fetchFoods(page: 1);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Si la API respondió, usamos los datos de la API. Si falló la conexión, usamos el catálogo local de referencia.
    final useApi = _hasLoadedFromApi;

    final List<Map<String, String>> localFiltered = sampleExchangeFoods.where((food) {
      final matchesQuery = _searchQuery.isEmpty ||
          (food['name'] ?? '').toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (food['equivalents'] ?? '').toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'Todos' || food['category'] == _selectedCategory;
      return matchesQuery && matchesCategory;
    }).toList();

    // Paginación local en caso de usar fallback
    final localTotalPages = ((localFiltered.length / _limit).ceil()).clamp(1, 9999);
    final effectiveTotalPages = useApi ? _totalPages : localTotalPages;
    final startIndex = (_currentPage - 1) * _limit;
    final endIndex = (startIndex + _limit).clamp(0, localFiltered.length);
    final paginatedLocal = startIndex < localFiltered.length
        ? localFiltered.sublist(startIndex, endIndex)
        : <Map<String, String>>[];

    final totalDisplayItems = useApi ? _apiFoods.length : paginatedLocal.length;

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
          'Alimentos de Intercambio',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.format_list_bulleted_rounded),
            tooltip: 'Ver Listas de Intercambio',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ExchangeListPage()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
            child: Row(
              children: [
                const Icon(Icons.swap_horizontal_circle_outlined, color: AppTheme.primaryPurple, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Sistema de equivalencias para sustitución rápida de alimentos según su grupo nutricional y porción de intercambio.',
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
                hintText: 'Buscar equivalente o alimento...',
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
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: categories.length,
              itemBuilder: (context, index) {
                final cat = categories[index];
                final isSelected = cat == _selectedCategory;
                return Padding(
                  padding: const EdgeInsets.only(right: 6.0),
                  child: FilterChip(
                    label: Text(cat),
                    selected: isSelected,
                    onSelected: (_) => _onCategorySelected(cat),
                    selectedColor: AppTheme.primaryPurple,
                    labelStyle: GoogleFonts.montserrat(
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? Colors.white : theme.colorScheme.onSurface,
                    ),
                    backgroundColor: theme.scaffoldBackgroundColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primaryPurple : AppTheme.borderLight,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryPurple))
                : totalDisplayItems == 0
                    ? Center(
                        child: Text(
                          'No se encontraron alimentos de intercambio.',
                          style: GoogleFonts.montserrat(color: AppTheme.textSecondaryLight),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: totalDisplayItems,
                        itemBuilder: (context, index) {
                          final String name = useApi ? _apiFoods[index].name : (paginatedLocal[index]['name'] ?? '');
                          final String category = useApi ? _apiFoods[index].category : (paginatedLocal[index]['category'] ?? '');
                          final String portion = useApi ? _apiFoods[index].portion : (paginatedLocal[index]['portion'] ?? '');
                          final String equivalents = useApi ? _apiFoods[index].equivalents : (paginatedLocal[index]['equivalents'] ?? '');
                          final String kcal = useApi ? _apiFoods[index].kcal : (paginatedLocal[index]['kcal'] ?? '');
                          final String macros = useApi ? _apiFoods[index].macros : (paginatedLocal[index]['macros'] ?? '');

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
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
                                            fontSize: 15,
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
                                          color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          kcal,
                                          style: GoogleFonts.montserrat(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryPurple,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Porción sugerida: $portion  •  $category',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 12,
                                      color: AppTheme.textSecondaryLight,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.loop_rounded, size: 16, color: AppTheme.accentPurple),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          'Equivalencias: $equivalents',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: theme.colorScheme.onSurface,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    macros,
                                    style: GoogleFonts.montserrat(
                                      fontSize: 11,
                                      color: AppTheme.textSecondaryLight,
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
                      _fetchFoods(page: _currentPage);
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
                      _fetchFoods(page: _currentPage);
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
