import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/main_navigation_shell.dart';
import '../../models/exchange_list_model.dart';
import '../../services/nutrition_service.dart';
import 'exchange_foods_page.dart';

class ExchangeListPage extends StatefulWidget {
  const ExchangeListPage({super.key});

  @override
  State<ExchangeListPage> createState() => _ExchangeListPageState();
}

class _ExchangeListPageState extends State<ExchangeListPage> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();

  List<ExchangeListModel> _exchangeLists = [];
  bool _isLoading = true;
  String? _errorMessage;

  int _currentPage = 1;
  int _totalPages = 1;
  static const int _limit = 10;

  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _loadPage(1);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPage(int page) async {
    debugPrint('[EXCHANGE_LIST_PAGE] Load start: page $page, query: "${_searchController.text.trim()}"');
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _nutritionService.getExchangeLists(
        page: page,
        limit: _limit,
        q: _searchController.text.trim(),
      );

      debugPrint('[EXCHANGE_LIST_PAGE] Data received: ${res.items.length} exchange lists (page: ${res.currentPage}/${res.totalPages}, total: ${res.total})');
      if (mounted) {
        setState(() {
          _exchangeLists = res.items;
          _currentPage = res.currentPage;
          _totalPages = res.totalPages;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('[EXCHANGE_LIST_PAGE] Catch block error loading exchange lists: $e\n$stack');
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al cargar las listas de intercambio: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      _loadPage(1);
    });
  }

  void _showDetailModal(BuildContext context, ExchangeListModel list) async {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return FutureBuilder<ExchangeListModel?>(
          future: _nutritionService.getExchangeListDetail(list.id),
          builder: (context, snapshot) {
            final detailedList = snapshot.data ?? list;
            final items = detailedList.items;

            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          detailedList.name,
                          style: GoogleFonts.montserrat(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${detailedList.baseKcal} kcal',
                          style: GoogleFonts.montserrat(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryPurple,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (detailedList.description != null && (detailedList.description?.isNotEmpty ?? false)) ...[
                    const SizedBox(height: 6),
                    Text(
                      detailedList.description ?? '',
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        color: AppTheme.textSecondaryLight,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  // Macros row
                  Row(
                    children: [
                      _buildMacroBadge('Proteínas', '${detailedList.baseProtein}g', const Color(0xFFE17055)),
                      const SizedBox(width: 8),
                      _buildMacroBadge('Grasas', '${detailedList.baseFat}g', const Color(0xFFFDCB6E)),
                      const SizedBox(width: 8),
                      _buildMacroBadge('Carbohidratos', '${detailedList.baseCarbs}g', const Color(0xFF0984E3)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppTheme.borderLight),
                  const SizedBox(height: 12),
                  Text(
                    'ALIMENTOS EN LA LISTA (${items.length})',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: CircularProgressIndicator(color: AppTheme.primaryPurple)),
                    )
                  else if (items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        'Esta lista no tiene alimentos asignados aún.',
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          color: AppTheme.textSecondaryLight,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    )
                  else
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.35,
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: items.length,
                        separatorBuilder: (context, index) => const Divider(height: 1, color: AppTheme.borderLight),
                        itemBuilder: (context, idx) {
                          final it = items[idx];
                          final food = it.food;
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              food?.name ?? 'Alimento',
                              style: GoogleFonts.montserrat(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                            subtitle: Text(
                              (it.servingLabel?.isNotEmpty ?? false)
                                  ? 'Porción: ${it.servingLabel}'
                                  : 'Raciones: ${it.amount}',
                              style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.textSecondaryLight),
                            ),
                            trailing: Text(
                              food != null ? '${food.calories.toStringAsFixed(0)} kcal' : '',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryPurple,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: Text(
                        'Cerrar',
                        style: GoogleFonts.montserrat(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMacroBadge(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.montserrat(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: GoogleFonts.montserrat(
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateExchangeListDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    String selectedCategory = 'General';
    final categories = [
      'General',
      'Cereales y Tubérculos',
      'Frutas',
      'Verduras',
      'Cárnicos Magros',
      'Lácteos Descremados',
      'Grasas',
      'Azúcares',
    ];

    showDialog(
      context: context,
      builder: (ctx) {
        bool isSubmitting = false;
        String? errorMsg;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(Icons.playlist_add_rounded, color: AppTheme.primaryPurple),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Nueva Lista de Intercambio',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (errorMsg != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.errorRed.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.errorRed.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          errorMsg!,
                          style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.errorRed),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Text(
                      'Nombre de la lista *',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: nameController,
                      decoration: InputDecoration(
                        hintText: 'Ej: Cereales y Tubérculos',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Categoría',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      initialValue: selectedCategory,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: categories.map((cat) {
                        return DropdownMenuItem(
                          value: cat,
                          child: Text(cat, style: GoogleFonts.montserrat(fontSize: 13)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() => selectedCategory = val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Descripción',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: descriptionController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Ej: Pan, arroz, pasta, papa y tubérculos...',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
                  child: Text(
                    'Cancelar',
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryPurple,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final name = nameController.text.trim();
                          if (name.isEmpty) {
                            setDialogState(() => errorMsg = 'El nombre de la lista es obligatorio.');
                            return;
                          }

                          setDialogState(() {
                            isSubmitting = true;
                            errorMsg = null;
                          });

                          try {
                            await _nutritionService.createExchangeList(
                              name: name,
                              description: descriptionController.text.trim(),
                              category: selectedCategory,
                            );

                            if (ctx.mounted) {
                              Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Lista de intercambio creada con éxito'),
                                  backgroundColor: AppTheme.successGreen,
                                ),
                              );
                              _loadPage(1);
                            }
                          } catch (e) {
                            if (ctx.mounted) {
                              setDialogState(() {
                                isSubmitting = false;
                                errorMsg = 'Error al crear la lista: $e';
                              });
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          'Crear Lista',
                          style: GoogleFonts.montserrat(fontWeight: FontWeight.bold),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
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
          'Listas de Intercambio',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded),
            tooltip: 'Crear Lista de Intercambio',
            onPressed: () => _showCreateExchangeListDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'Alimentos de Intercambio',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ExchangeFoodsPage()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar',
            onPressed: () => _loadPage(_currentPage),
          ),
        ],
      ),
      body: Column(
        children: [
          // Header Explicativo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppTheme.softPurpleChip.withValues(alpha: 0.5),
            child: Row(
              children: [
                const Icon(Icons.format_list_bulleted_rounded, color: AppTheme.primaryPurple, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Listas maestras del nutricionista. Cada lista define calorías estándar y equivalencias de macronutrientes.',
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

          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar lista por nombre o descripción...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.primaryPurple),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          _loadPage(1);
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

          // Content List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primaryPurple),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorRed),
                              const SizedBox(height: 12),
                              Text(
                                _errorMessage ?? 'Error desconocido',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.montserrat(color: AppTheme.textSecondaryLight),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () => _loadPage(_currentPage),
                                child: const Text('Reintentar'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _exchangeLists.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.playlist_remove_rounded, size: 54, color: Colors.grey),
                                const SizedBox(height: 12),
                                Text(
                                  'No se encontraron listas de intercambio',
                                  style: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Crea listas desde el panel web o sincroniza tu cuenta.',
                                  style: GoogleFonts.montserrat(color: AppTheme.textSecondaryLight),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: _exchangeLists.length,
                            itemBuilder: (context, index) {
                              final item = _exchangeLists[index];

                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                child: InkWell(
                                  onTap: () => _showDetailModal(context, item),
                                  borderRadius: BorderRadius.circular(14),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                item.name,
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
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppTheme.primaryPurple.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                '${item.baseKcal} kcal',
                                                style: GoogleFonts.montserrat(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppTheme.primaryPurple,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if (item.description != null && (item.description?.isNotEmpty ?? false)) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            item.description ?? '',
                                            style: GoogleFonts.montserrat(
                                              fontSize: 12,
                                              color: AppTheme.textSecondaryLight,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                        const SizedBox(height: 8),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                'P: ${item.baseProtein}g  •  G: ${item.baseFat}g  •  C: ${item.baseCarbs}g',
                                                style: GoogleFonts.montserrat(
                                                  fontSize: 11.5,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme.textSecondaryLight,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isDark ? Colors.grey[800] : Colors.grey[200],
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                '${item.itemsCount} alimentos',
                                                style: GoogleFonts.montserrat(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w500,
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
                            },
                          ),
          ),

          // Pagination Controls (10 por página, sin scroll infinito)
          if (!_isLoading && _exchangeLists.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
              child: _buildPaginationBar(context, isDark),
            ),
        ],
      ),
    );
  }

  Widget _buildPaginationBar(BuildContext context, bool isDark) {
    final hasPrev = _currentPage > 1;
    final hasNext = _currentPage < _totalPages;

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
              onPressed: hasPrev ? () => _loadPage(_currentPage - 1) : null,
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
              'Página $_currentPage de ${_totalPages < 1 ? 1 : _totalPages}',
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
              onPressed: hasNext ? () => _loadPage(_currentPage + 1) : null,
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
