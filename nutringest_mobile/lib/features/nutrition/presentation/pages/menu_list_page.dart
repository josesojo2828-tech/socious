import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/main_navigation_shell.dart';
import '../../models/menu_model.dart';
import '../../services/nutrition_service.dart';
import 'menu_detail_page.dart';

class MenuListPage extends StatefulWidget {
  final NutritionService? nutritionService;
  final List<MenuModel>? initialMenus;
  final MenuDashboardMetricsModel? initialMetrics;

  const MenuListPage({
    super.key,
    this.nutritionService,
    this.initialMenus,
    this.initialMetrics,
  });

  @override
  State<MenuListPage> createState() => _MenuListPageState();
}

class _MenuListPageState extends State<MenuListPage> {
  late final NutritionService _nutritionService;
  final TextEditingController _searchController = TextEditingController();

  List<MenuModel> _menus = [];
  MenuDashboardMetricsModel _metrics = MenuDashboardMetricsModel.empty();
  bool _isLoading = true;
  String? _errorMessage;

  String _selectedCategoryChip = 'TODOS';
  int _currentPage = 1;
  int _totalPages = 1;
  Timer? _debounceTimer;

  static const List<String> _categoryChips = [
    'TODOS',
    'DESAYUNO',
    'ALMUERZO',
    'CENA',
    'MERIENDA',
    'OTRO',
  ];

  static const Map<String, String> _chipToBackendCategory = {
    'TODOS': 'TODOS',
    'DESAYUNO': 'BREAKFAST',
    'ALMUERZO': 'LUNCH',
    'CENA': 'DINNER',
    'MERIENDA': 'SNACK',
    'OTRO': 'OTHER',
  };

  @override
  void initState() {
    super.initState();
    _nutritionService = widget.nutritionService ?? NutritionService();
    if (widget.initialMenus != null) {
      _menus = widget.initialMenus ?? [];
      _metrics = widget.initialMetrics ?? MenuDashboardMetricsModel.empty();
      _isLoading = false;
      debugPrint('[MENU_LIST_PAGE] initState: Pre-seeded with ${_menus.length} menus, metrics=${_metrics.totalMenus}');
    } else {
      _loadInitialData();
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    debugPrint('[MENU_LIST_PAGE] _loadInitialData() started. Current page=$_currentPage, category=$_selectedCategoryChip');
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _nutritionService.getMenuDashboard(),
        _fetchFilteredMenus(),
      ]);

      if (mounted) {
        final fetchedMetrics = results[0] as MenuDashboardMetricsModel? ?? MenuDashboardMetricsModel.empty();
        final fetchedMenus = results[1] as List<MenuModel>? ?? <MenuModel>[];

        debugPrint('[MENU_LIST_PAGE] _loadInitialData() success: '
            'menusCount=${fetchedMenus.length}, '
            'totalMenus=${fetchedMetrics.totalMenus}, '
            'avgKcal=${fetchedMetrics.avgCalories.toStringAsFixed(1)}');

        setState(() {
          _metrics = fetchedMetrics;
          _menus = fetchedMenus;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('[MENU_LIST_PAGE] _loadInitialData() ERROR: $e\n$stack');
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al cargar los menús: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<List<MenuModel>> _fetchFilteredMenus({int page = 1}) async {
    final backendCategory = _chipToBackendCategory[_selectedCategoryChip];
    final queryText = _searchController.text.trim();
    debugPrint('[MENU_LIST_PAGE] _fetchFilteredMenus: page=$page, category=$backendCategory, query="$queryText"');

    final res = await _nutritionService.getMenus(
      page: page,
      limit: 10,
      q: queryText,
      category: backendCategory == 'TODOS' ? null : backendCategory,
    );
    _currentPage = res.currentPage;
    _totalPages = res.totalPages;
    debugPrint('[MENU_LIST_PAGE] _fetchFilteredMenus result: ${res.items.length} items (currentPage=${res.currentPage}, totalPages=${res.totalPages}, total=${res.total})');
    return res.items;
  }

  Future<void> _changePage(int page) async {
    debugPrint('[MENU_LIST_PAGE] _changePage to page=$page');
    setState(() => _isLoading = true);
    try {
      final updatedMenus = await _fetchFilteredMenus(page: page);
      if (mounted) {
        setState(() {
          _menus = updatedMenus;
          _isLoading = false;
        });
        debugPrint('[MENU_LIST_PAGE] _changePage success: loaded ${_menus.length} menus');
      }
    } catch (e, stack) {
      debugPrint('[MENU_LIST_PAGE] _changePage ERROR: $e\n$stack');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _refreshMenusOnly() async {
    debugPrint('[MENU_LIST_PAGE] _refreshMenusOnly started');
    try {
      final updatedMenus = await _fetchFilteredMenus(page: _currentPage);
      if (mounted) {
        setState(() {
          _menus = updatedMenus;
        });
        debugPrint('[MENU_LIST_PAGE] _refreshMenusOnly success: ${_menus.length} menus');
      }
    } catch (e) {
      debugPrint('[MENU_LIST_PAGE] _refreshMenusOnly ERROR: $e');
    }
  }

  void _onSearchChanged(String value) {
    debugPrint('[MENU_LIST_PAGE] _onSearchChanged: "$value"');
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      _changePage(1);
    });
  }

  void _onCategorySelected(String chip) {
    if (_selectedCategoryChip == chip) return;
    debugPrint('[MENU_LIST_PAGE] _onCategorySelected: "$chip"');
    setState(() {
      _selectedCategoryChip = chip;
    });
    _changePage(1);
  }

  Future<void> _handleDeleteMenu(MenuModel menu) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed, size: 24),
            const SizedBox(width: 8),
            Text(
              'Eliminar Menú',
              style: GoogleFonts.montserrat(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
        content: Text(
          '¿Estás seguro de que deseas eliminar el menú "${menu.name}"? Esta acción no se puede deshacer.',
          style: GoogleFonts.montserrat(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancelar',
              style: GoogleFonts.montserrat(
                fontWeight: FontWeight.w600,
                color: AppTheme.textSecondaryLight,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorRed,
              foregroundColor: Colors.white,
              minimumSize: const Size(100, 42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Eliminar',
              style: GoogleFonts.montserrat(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _nutritionService.deleteMenu(menu.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Menú "${menu.name}" eliminado correctamente',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.primaryPurple,
            ),
          );
          _loadInitialData();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'No se pudo eliminar el menú',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.errorRed,
            ),
          );
        }
      }
    }
  }

  void _openCreateMenuModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CreateMenuModal(
        onMenuCreated: (newMenu) {
          _loadInitialData();
          if (newMenu != null && mounted) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => MenuDetailPage(menuId: newMenu.id),
              ),
            );
          }
        },
      ),
    );
  }

  Color _getCategoryColor(String? category) {
    switch ((category ?? 'OTHER').toUpperCase()) {
      case 'BREAKFAST':
      case 'DESAYUNO':
        return const Color(0xFFD97706);
      case 'LUNCH':
      case 'ALMUERZO':
        return const Color(0xFF059669);
      case 'DINNER':
      case 'CENA':
        return const Color(0xFF7C3AED);
      case 'SNACK':
      case 'MERIENDA':
        return const Color(0xFFEA580C);
      default:
        return const Color(0xFF4B5563);
    }
  }

  String _formatCategoryLabel(String? category) {
    switch ((category ?? 'OTHER').toUpperCase()) {
      case 'BREAKFAST':
        return 'Desayuno';
      case 'LUNCH':
        return 'Almuerzo';
      case 'DINNER':
        return 'Cena';
      case 'SNACK':
        return 'Merienda';
      case 'OTHER':
        return 'Otro';
      default:
        return category ?? 'Otro';
    }
  }

  IconData _getCategoryIcon(String? category) {
    switch ((category ?? 'OTHER').toUpperCase()) {
      case 'BREAKFAST':
      case 'DESAYUNO':
        return Icons.wb_sunny_rounded;
      case 'LUNCH':
      case 'ALMUERZO':
        return Icons.restaurant_rounded;
      case 'DINNER':
      case 'CENA':
        return Icons.nightlight_round;
      case 'SNACK':
      case 'MERIENDA':
        return Icons.coffee_rounded;
      default:
        return Icons.restaurant_menu_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('[MENU_LIST_PAGE] build() rendering. isLoading=$_isLoading, menusCount=${_menus.length}, error=$_errorMessage');
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
          'Catálogo de Menús',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar',
            onPressed: _loadInitialData,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Crear Menú',
            onPressed: _openCreateMenuModal,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadInitialData,
        color: AppTheme.primaryPurple,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // 1. SEARCH BAR & CATEGORY FILTERS
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search bar
                    Container(
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
                      child: TextField(
                        controller: _searchController,
                        onChanged: _onSearchChanged,
                        decoration: InputDecoration(
                          hintText: 'Buscar por nombre, descripción o tag...',
                          hintStyle: GoogleFonts.montserrat(
                            fontSize: 13,
                            color: AppTheme.textSecondaryLight,
                          ),
                          prefixIcon: const Icon(
                            Icons.search_rounded,
                            color: AppTheme.accentPurple,
                          ),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, size: 20),
                                  onPressed: () {
                                    _searchController.clear();
                                    _refreshMenusOnly();
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Filter chips row
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categoryChips.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final chip = _categoryChips[index];
                          final isSelected = _selectedCategoryChip == chip;
                          return ChoiceChip(
                            label: Text(
                              chip,
                              style: GoogleFonts.montserrat(
                                fontSize: 11,
                                fontWeight:
                                    isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : (isDark
                                        ? AppTheme.textSecondaryDark
                                        : AppTheme.textSecondaryLight),
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppTheme.primaryPurple,
                            backgroundColor:
                                isDark ? AppTheme.cardDark : Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(
                                color: isSelected
                                    ? AppTheme.primaryPurple
                                    : (isDark
                                        ? AppTheme.borderDark
                                        : AppTheme.borderLight),
                              ),
                            ),
                            showCheckmark: false,
                            onSelected: (_) => _onCategorySelected(chip),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 3. MENUS LIST / EMPTY STATE / LOADING
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppTheme.primaryPurple),
                ),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          color: AppTheme.errorRed,
                          size: 48,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _errorMessage ?? 'Error desconocido',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.montserrat(
                            color: AppTheme.textSecondaryLight,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadInitialData,
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (_menus.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildEmptyState(isDark),
              )
            else ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final menu = _menus[index];
                      return _buildMenuCard(menu, isDark);
                    },
                    childCount: _menus.length,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                  child: _buildPaginationBar(isDark),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaginationBar(bool isDark) {
    final hasPrev = _currentPage > 1;
    final hasNext = _currentPage < _totalPages;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
              onPressed: hasPrev ? () => _changePage(_currentPage - 1) : null,
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
                        fontSize: 11,
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
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primaryPurple.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Página $_currentPage de ${_totalPages < 1 ? 1 : _totalPages}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryPurple,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: ElevatedButton(
              onPressed: hasNext ? () => _changePage(_currentPage + 1) : null,
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
                        fontSize: 11,
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



  Widget _buildMacroPill(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$label: ',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuCard(MenuModel menu, bool isDark) {
    final catColor = _getCategoryColor(menu.category);
    final catIcon = _getCategoryIcon(menu.category);
    final catLabel = _formatCategoryLabel(menu.category);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(18),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () async {
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => MenuDetailPage(menuId: menu.id),
              ),
            );
            _loadInitialData();
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Category badge, title, options
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image / Placeholder
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 58,
                        height: 58,
                        color: catColor.withValues(alpha: 0.12),
                        child: (menu.imageUrl != null && (menu.imageUrl?.startsWith('http') ?? false))
                            ? Image.network(
                                menu.imageUrl ?? '',
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Icon(
                                  catIcon,
                                  color: catColor,
                                  size: 26,
                                ),
                              )
                            : Icon(catIcon, color: catColor, size: 26),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Title & Category
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2.5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: catColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    catLabel.toUpperCase(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.montserrat(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: catColor,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              // Total Kcal Badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2.5,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD97706).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.bolt_rounded,
                                      size: 13,
                                      color: Color(0xFFD97706),
                                    ),
                                    Text(
                                      '${menu.totalKcal.toStringAsFixed(0)} kcal',
                                      style: GoogleFonts.montserrat(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            menu.name,
                            style: GoogleFonts.montserrat(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isDark
                                  ? AppTheme.textPrimaryDark
                                  : AppTheme.textPrimaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // Popup Menu
                    PopupMenuButton<String>(
                      icon: Icon(
                        Icons.more_vert_rounded,
                        color: AppTheme.textSecondaryLight,
                        size: 20,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      onSelected: (value) {
                        if (value == 'detail') {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => MenuDetailPage(menuId: menu.id),
                            ),
                          );
                        } else if (value == 'delete') {
                          _handleDeleteMenu(menu);
                        }
                      },
                      itemBuilder: (ctx) => [
                        PopupMenuItem(
                          value: 'detail',
                          child: Row(
                            children: [
                              const Icon(
                                Icons.visibility_rounded,
                                size: 18,
                                color: AppTheme.primaryPurple,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Ver Ficha 360°',
                                style: GoogleFonts.montserrat(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              const Icon(
                                Icons.delete_outline_rounded,
                                size: 18,
                                color: AppTheme.errorRed,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Eliminar',
                                style: GoogleFonts.montserrat(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.errorRed,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Description (if available)
                if (menu.description != null && (menu.description?.trim().isNotEmpty ?? false)) ...[
                  Text(
                    menu.description ?? '',
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      color: AppTheme.textSecondaryLight,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                ],

                // Macro Chips Row
                Row(
                  children: [
                    Flexible(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildMacroPill(
                              'P',
                              '${menu.totalProtein.toStringAsFixed(1)}g',
                              const Color(0xFFEF4444),
                            ),
                            const SizedBox(width: 6),
                            _buildMacroPill(
                              'C',
                              '${menu.totalCarbs.toStringAsFixed(1)}g',
                              const Color(0xFF10B981),
                            ),
                            const SizedBox(width: 6),
                            _buildMacroPill(
                              'G',
                              '${menu.totalFats.toStringAsFixed(1)}g',
                              const Color(0xFFF59E0B),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Ingredients count
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.kitchen_rounded,
                          size: 14,
                          color: AppTheme.textSecondaryLight,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${menu.itemsCount} ingr.',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Tags chips (if present)
                if (menu.tags != null && (menu.tags?.trim().isNotEmpty ?? false)) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: (menu.tags ?? '')
                        .split(',')
                        .map((t) => t.trim())
                        .where((t) => t.isNotEmpty)
                        .map(
                          (tag) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppTheme.borderDark
                                  : AppTheme.borderLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '#$tag',
                              style: GoogleFonts.montserrat(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.textSecondaryLight,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.restaurant_menu_outlined,
                color: AppTheme.primaryPurple,
                size: 48,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No hay menús registrados',
              style: GoogleFonts.montserrat(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: isDark
                    ? AppTheme.textPrimaryDark
                    : AppTheme.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchController.text.isNotEmpty || _selectedCategoryChip != 'TODOS'
                  ? 'No se encontraron menús que coincidan con los filtros aplicados.'
                  : 'Crea plantillas de menús y dietas reutilizables para asignar a tus pacientes.',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 13,
                color: AppTheme.textSecondaryLight,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _openCreateMenuModal,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryPurple,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
              icon: const Icon(Icons.add_rounded),
              label: Text(
                'Crear Primer Menú',
                style: GoogleFonts.montserrat(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateMenuModal extends StatefulWidget {
  final ValueChanged<MenuModel?> onMenuCreated;

  const _CreateMenuModal({required this.onMenuCreated});

  @override
  State<_CreateMenuModal> createState() => _CreateMenuModalState();
}

class _CreateMenuModalState extends State<_CreateMenuModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _tagsController = TextEditingController();
  final NutritionService _nutritionService = NutritionService();

  String _selectedCategory = 'LUNCH';
  bool _isSaving = false;

  static const List<Map<String, String>> _categoryOptions = [
    {'value': 'BREAKFAST', 'label': 'Desayuno'},
    {'value': 'LUNCH', 'label': 'Almuerzo'},
    {'value': 'DINNER', 'label': 'Cena'},
    {'value': 'SNACK', 'label': 'Merienda'},
    {'value': 'OTHER', 'label': 'Otro'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isSaving = true);

    try {
      final newMenu = await _nutritionService.createMenu(
        name: _nameController.text.trim(),
        category: _selectedCategory,
        description: _descController.text.trim(),
        tags: _tagsController.text.trim(),
      );

      if (mounted) {
        Navigator.of(context).pop();
        widget.onMenuCreated(newMenu);
      }
    } catch (e, stack) {
      debugPrint('[MENU_LIST_PAGE] createMenu ERROR: $e\n$stack');
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Error al crear el menú: ${e.toString()}',
              style: GoogleFonts.montserrat(),
            ),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.restaurant_menu_rounded,
                      color: AppTheme.primaryPurple,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Crear Nuevo Menú',
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark
                          ? AppTheme.textPrimaryDark
                          : AppTheme.textPrimaryLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Field: Nombre (required)
              Text(
                'Nombre del Menú *',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'El nombre es requerido';
                  }
                  if (val.trim().length < 3) {
                    return 'Debe tener al menos 3 caracteres';
                  }
                  return null;
                },
                decoration: InputDecoration(
                  hintText: 'Ej. Almuerzo Proteico Mediterráneo',
                  hintStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    color: AppTheme.textSecondaryLight,
                  ),
                  filled: true,
                  fillColor: isDark ? AppTheme.bgDark : AppTheme.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Field: Categoría (dropdown)
              Text(
                'Categoría *',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: isDark ? AppTheme.bgDark : AppTheme.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
                items: _categoryOptions.map((opt) {
                  return DropdownMenuItem<String>(
                    value: opt['value'],
                    child: Text(
                      opt['label'] ?? '',
                      style: GoogleFonts.montserrat(fontSize: 14),
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
              const SizedBox(height: 16),

              // Field: Descripción
              Text(
                'Descripción',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Describe el menú, recomendaciones o notas...',
                  hintStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    color: AppTheme.textSecondaryLight,
                  ),
                  filled: true,
                  fillColor: isDark ? AppTheme.bgDark : AppTheme.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                    ),
                  ),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 16),

              // Field: Etiquetas
              Text(
                'Etiquetas (separadas por comas)',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _tagsController,
                decoration: InputDecoration(
                  hintText: 'Ej. vegano, hiperproteico, bajo-sodio',
                  hintStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    color: AppTheme.textSecondaryLight,
                  ),
                  filled: true,
                  fillColor: isDark ? AppTheme.bgDark : AppTheme.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        minimumSize: const Size(0, 48),
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Cancelar',
                        style: GoogleFonts.montserrat(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        minimumSize: const Size(0, 48),
                      ),
                      onPressed: _isSaving ? null : _submit,
                      child: _isSaving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Crear Menú',
                              style: GoogleFonts.montserrat(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
