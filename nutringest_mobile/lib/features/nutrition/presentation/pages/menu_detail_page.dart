import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/food_item_model.dart';
import '../../models/menu_model.dart';
import '../../services/nutrition_service.dart';

class MenuDetailPage extends StatefulWidget {
  final String menuId;

  const MenuDetailPage({super.key, required this.menuId});

  @override
  State<MenuDetailPage> createState() => _MenuDetailPageState();
}

class _MenuDetailPageState extends State<MenuDetailPage>
    with SingleTickerProviderStateMixin {
  final NutritionService _nutritionService = NutritionService();

  MenuModel? _menu;
  bool _isLoading = true;
  String? _errorMessage;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadMenuDetail();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadMenuDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final menu = await _nutritionService.getMenuDetail(widget.menuId);
      if (mounted) {
        if (menu != null) {
          setState(() {
            _menu = menu;
            _isLoading = false;
          });
        } else {
          setState(() {
            _errorMessage = 'No se encontró la información del menú solicitado.';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al cargar el detalle: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  void _copyAiPrompt() {
    if (_menu == null) return;
    final items = _menu!.items;
    final ingredientesTexto = items
        .where((item) => item.quantity > 0 && item.foodName.isNotEmpty)
        .map((item) {
          final qty = item.quantity % 1 == 0
              ? item.quantity.toInt().toString()
              : item.quantity.toString();
          final unit = item.unit ?? 'g';
          final portion =
              item.portionLabel != null && item.portionLabel!.trim().isNotEmpty
                  ? '${item.portionLabel} '
                  : '';
          return '$qty$unit $portion${item.foodName}';
        })
        .join(', ');

    const promptTemplate = '''ÁNGULO: Cenital (90°) o picado pronunciado - para ver proporciones
FONDO: Oscuro y minimalista (pizarra/tela negra) - sin cubiertos
EMPLAZADO: Ingredientes separados y ordenados - proteína rebanada, guarniciones como "camadita"
TRAZOS: Purés o salsas en forma de lágrima o líneas curvas
ILUMINACIÓN: Luz lateral/diagonal - sombras suaves que resaltan texturas
ESPACIO NEGATIVO: Plato centrado, alrededor de vacío - limpieza y modernidad''';

    final buffer = StringBuffer();
    buffer.writeln(
        'Genera una imagen fotorrealista y profesional del plato de comida "${_menu!.name}":\n');
    buffer.writeln(promptTemplate);
    buffer.writeln('\nINGREDIENTES Y PROPORCIONES:');
    if (ingredientesTexto.isNotEmpty) {
      buffer.writeln('- $ingredientesTexto');
    } else {
      buffer.writeln('- No hay ingredientes cargados');
    }
    buffer.writeln('\nTOTALES NUTRICIONALES:');
    buffer.writeln('- Calorías: ${_menu!.totalKcal.toStringAsFixed(0)} kcal');
    buffer.writeln('- Proteínas: ${_menu!.totalProtein.toStringAsFixed(1)} g');
    buffer.writeln('- Carbohidratos: ${_menu!.totalCarbs.toStringAsFixed(1)} g');
    buffer.writeln('- Grasas: ${_menu!.totalFats.toStringAsFixed(1)} g');

    Clipboard.setData(ClipboardData(text: buffer.toString().trim()));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Prompt IA copiado al portapapeles',
                style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.successGreen,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _handleDeleteIngredient(MenuItemModel item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          '¿Eliminar Ingrediente?',
          style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        content: Text(
          '¿Deseas quitar "${item.foodName}" de este menú? Los totales nutricionales se recalcularán automáticamente.',
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
      final success = await _nutritionService.deleteMenuItem(item.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Ingrediente eliminado',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.primaryPurple,
            ),
          );
          _loadMenuDetail();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'No se pudo eliminar el ingrediente',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.errorRed,
            ),
          );
        }
      }
    }
  }

  Future<void> _handleDeleteCondiment(MenuCondimentModel condiment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          '¿Eliminar Condimento?',
          style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        content: Text(
          '¿Deseas quitar "${condiment.condimentName}" del menú?',
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
      final success = await _nutritionService.deleteMenuCondiment(condiment.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Condimento eliminado',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.primaryPurple,
            ),
          );
          _loadMenuDetail();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'No se pudo eliminar el condimento',
                style: GoogleFonts.montserrat(),
              ),
              backgroundColor: AppTheme.errorRed,
            ),
          );
        }
      }
    }
  }

  void _openAddIngredientModal() {
    if (_menu == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddMenuItemModal(
        menuId: _menu!.id,
        onItemAdded: () {
          _loadMenuDetail();
        },
      ),
    );
  }

  void _openAddCondimentModal() {
    if (_menu == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddMenuCondimentModal(
        menuId: _menu!.id,
        onCondimentAdded: () {
          _loadMenuDetail();
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Cargando menú...')),
        body: const Center(
          child: CircularProgressIndicator(color: AppTheme.primaryPurple),
        ),
      );
    }

    if (_errorMessage != null || _menu == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
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
                  _errorMessage ?? 'No se encontró el menú',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.montserrat(fontSize: 14),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _loadMenuDetail,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final menu = _menu!;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Ficha del Menú 360°',
          style: GoogleFonts.montserrat(
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Recargar',
            onPressed: _loadMenuDetail,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. HEADER CARD (Sticky / Top Info)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: _buildHeaderCard(menu, isDark),
          ),

          // 2. TAB BAR
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.cardDark : Colors.white,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                ),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: AppTheme.primaryPurple,
              unselectedLabelColor: AppTheme.textSecondaryLight,
              indicatorColor: AppTheme.primaryPurple,
              indicatorWeight: 3,
              labelStyle: GoogleFonts.montserrat(
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
              unselectedLabelStyle: GoogleFonts.montserrat(
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
              tabs: const [
                Tab(
                  icon: Icon(Icons.restaurant_menu_rounded, size: 18),
                  text: 'Receta',
                ),
                Tab(
                  icon: Icon(Icons.description_rounded, size: 18),
                  text: 'Detalles',
                ),
                Tab(
                  icon: Icon(Icons.camera_alt_rounded, size: 18),
                  text: 'Foto',
                ),
              ],
            ),
          ),

          // 3. TAB VIEWS
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildRecipeTab(menu, isDark),
                _buildDetailsTab(menu, isDark),
                _buildPhotoTab(menu, isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(MenuModel menu, bool isDark) {
    final catColor = _getCategoryColor(menu.category);
    final catLabel = _formatCategoryLabel(menu.category);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category Badge + Kcal Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: catColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  catLabel.toUpperCase(),
                  style: GoogleFonts.montserrat(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: catColor,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.bolt_rounded,
                      size: 16,
                      color: Color(0xFFD97706),
                    ),
                    const SizedBox(width: 2),
                    Text(
                      '${menu.totalKcal.toStringAsFixed(0)} kcal',
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Menu Title
          Text(
            menu.name,
            style: GoogleFonts.montserrat(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? AppTheme.textPrimaryDark : AppTheme.textPrimaryLight,
            ),
          ),
          const SizedBox(height: 12),

          // Macro Breakdown Cards
          Row(
            children: [
              Expanded(
                child: _buildMacroBox(
                  'Proteínas',
                  '${menu.totalProtein.toStringAsFixed(1)}g',
                  const Color(0xFFEF4444),
                  isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMacroBox(
                  'Carbohidratos',
                  '${menu.totalCarbs.toStringAsFixed(1)}g',
                  const Color(0xFF10B981),
                  isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMacroBox(
                  'Grasas',
                  '${menu.totalFats.toStringAsFixed(1)}g',
                  const Color(0xFFF59E0B),
                  isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Copy AI Prompt Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _copyAiPrompt,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.primaryPurple,
                side: BorderSide(
                  color: AppTheme.primaryPurple.withValues(alpha: 0.4),
                  width: 1.2,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              icon: const Icon(Icons.copy_rounded, size: 16),
              label: Text(
                'Copiar Prompt IA para foto',
                style: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMacroBox(String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.montserrat(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondaryLight,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 1: RECETA & INGREDIENTES
  // ===========================================================================
  Widget _buildRecipeTab(MenuModel menu, bool isDark) {
    return RefreshIndicator(
      onRefresh: _loadMenuDetail,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ingredients Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.kitchen_rounded,
                      color: AppTheme.primaryPurple,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Ingredientes (${menu.items.length})',
                      style: GoogleFonts.montserrat(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark
                            ? AppTheme.textPrimaryDark
                            : AppTheme.textPrimaryLight,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: _openAddIngredientModal,
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.primaryPurple,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                  ),
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: Text(
                    'Agregar',
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // List of Food Items
            if (menu.items.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.cardDark : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.no_meals_rounded,
                      color: AppTheme.textSecondaryLight,
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No hay ingredientes agregados',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: isDark
                            ? AppTheme.textPrimaryDark
                            : AppTheme.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Agrega alimentos desde el catálogo para calcular los macronutrientes.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        color: AppTheme.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: menu.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = menu.items[index];
                  return _buildIngredientCard(item, isDark);
                },
              ),

            const SizedBox(height: 24),

            // Condiments Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.eco_rounded,
                      color: Color(0xFF10B981),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Condimentos (${menu.condiments.length})',
                      style: GoogleFonts.montserrat(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark
                            ? AppTheme.textPrimaryDark
                            : AppTheme.textPrimaryLight,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: _openAddCondimentModal,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                  ),
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: Text(
                    'Agregar',
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // List of Condiments
            if (menu.condiments.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.cardDark : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                  ),
                ),
                child: Center(
                  child: Text(
                    'Sin condimentos asignados (ej. canela, orégano, pimienta)',
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      color: AppTheme.textSecondaryLight,
                    ),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: menu.condiments.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final condiment = menu.condiments[index];
                  return _buildCondimentCard(condiment, isDark);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildIngredientCard(MenuItemModel item, bool isDark) {
    final qtyText = item.quantity % 1 == 0
        ? '${item.quantity.toInt()} ${item.unit ?? 'g'}'
        : '${item.quantity.toStringAsFixed(1)} ${item.unit ?? 'g'}';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryPurple.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.restaurant_rounded,
              color: AppTheme.primaryPurple,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.foodName,
                  style: GoogleFonts.montserrat(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isDark
                        ? AppTheme.textPrimaryDark
                        : AppTheme.textPrimaryLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item.portionLabel != null && item.portionLabel!.isNotEmpty
                      ? '$qtyText · ${item.portionLabel}'
                      : qtyText,
                  style: GoogleFonts.montserrat(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      '${item.foodCalories.toStringAsFixed(0)} kcal',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFD97706),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'P: ${item.foodProteins.toStringAsFixed(1)}g',
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFFEF4444),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'C: ${item.foodCarbs.toStringAsFixed(1)}g',
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF10B981),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'G: ${item.foodFats.toStringAsFixed(1)}g',
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFFF59E0B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.delete_outline_rounded,
              color: AppTheme.errorRed,
              size: 20,
            ),
            tooltip: 'Eliminar ingrediente',
            onPressed: () => _handleDeleteIngredient(item),
          ),
        ],
      ),
    );
  }

  Widget _buildCondimentCard(MenuCondimentModel condiment, bool isDark) {
    String qtyText = '';
    if (condiment.quantity != null && condiment.quantity! > 0) {
      final q = condiment.quantity! % 1 == 0
          ? condiment.quantity!.toInt().toString()
          : condiment.quantity!.toStringAsFixed(1);
      qtyText = '$q ${condiment.unit ?? 'g'}';
    } else {
      qtyText = condiment.unit ?? 'Al gusto';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.eco_rounded,
              color: Color(0xFF10B981),
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  condiment.condimentName,
                  style: GoogleFonts.montserrat(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: isDark
                        ? AppTheme.textPrimaryDark
                        : AppTheme.textPrimaryLight,
                  ),
                ),
                Text(
                  qtyText,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.delete_outline_rounded,
              color: AppTheme.errorRed,
              size: 18,
            ),
            tooltip: 'Eliminar condimento',
            onPressed: () => _handleDeleteCondiment(condiment),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 2: DETALLES & PUBLICACIÓN
  // ===========================================================================
  Widget _buildDetailsTab(MenuModel menu, bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Descripción Card
          _buildSectionCard(
            title: 'Descripción del Menú',
            icon: Icons.description_outlined,
            isDark: isDark,
            child: Text(
              (menu.description != null && (menu.description?.trim().isNotEmpty ?? false))
                  ? (menu.description ?? '')
                  : 'Sin descripción detallada.',
              style: GoogleFonts.montserrat(
                fontSize: 13,
                height: 1.5,
                color: isDark
                    ? AppTheme.textPrimaryDark
                    : AppTheme.textPrimaryLight,
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Metadatos y Creador
          _buildSectionCard(
            title: 'Información y Registro',
            icon: Icons.badge_outlined,
            isDark: isDark,
            child: Column(
              children: [
                _buildMetaRow(
                  'Creado por',
                  menu.createdBy ?? 'Nutricionista',
                  Icons.person_rounded,
                  isDark,
                ),
                const Divider(height: 18),
                _buildMetaRow(
                  'Fecha de Creación',
                  menu.createdAt != null
                      ? '${menu.createdAt?.day.toString().padLeft(2, '0')}/${menu.createdAt?.month.toString().padLeft(2, '0')}/${menu.createdAt?.year}'
                      : 'No especificada',
                  Icons.calendar_today_rounded,
                  isDark,
                ),
                const Divider(height: 18),
                _buildMetaRow(
                  'Categoría',
                  _formatCategoryLabel(menu.category),
                  Icons.category_rounded,
                  isDark,
                ),
                const Divider(height: 18),
                _buildMetaRow(
                  'ID del Menú',
                  menu.id,
                  Icons.fingerprint_rounded,
                  isDark,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Publicación en la Comunidad Card
          _buildSectionCard(
            title: 'Estado de Publicación en Comunidad',
            icon: Icons.public_rounded,
            isDark: isDark,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: menu.publishedAt != null
                    ? AppTheme.successGreen.withValues(alpha: 0.08)
                    : Colors.grey.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: menu.publishedAt != null
                      ? AppTheme.successGreen.withValues(alpha: 0.3)
                      : Colors.grey.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    menu.publishedAt != null
                        ? Icons.check_circle_rounded
                        : Icons.lock_rounded,
                    color: menu.publishedAt != null
                        ? AppTheme.successGreen
                        : AppTheme.textSecondaryLight,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          menu.publishedAt != null
                              ? 'Publicado en la Comunidad'
                              : 'Privado (Solo en tu Catálogo)',
                          style: GoogleFonts.montserrat(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: menu.publishedAt != null
                                ? AppTheme.successGreen
                                : (isDark
                                    ? AppTheme.textPrimaryDark
                                    : AppTheme.textPrimaryLight),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          menu.publishedAt != null
                              ? 'Visible para otros colegas nutricionistas en la red Nutringest.'
                              : 'Este menú es privado y solo visible para ti y tus pacientes.',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required bool isDark,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppTheme.primaryPurple, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildMetaRow(
    String label,
    String value,
    IconData icon,
    bool isDark,
  ) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.textSecondaryLight),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppTheme.textSecondaryLight,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: GoogleFonts.montserrat(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDark
                  ? AppTheme.textPrimaryDark
                  : AppTheme.textPrimaryLight,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // TAB 3: FOTO DEL MENÚ
  // ===========================================================================
  Widget _buildPhotoTab(MenuModel menu, bool isDark) {
    final hasImage = menu.imageUrl != null && menu.imageUrl!.startsWith('http');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            height: 280,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: hasImage
                  ? Image.network(
                      menu.imageUrl ?? '',
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildNoPhotoPlaceholder(isDark),
                    )
                  : _buildNoPhotoPlaceholder(isDark),
            ),
          ),
          const SizedBox(height: 20),

          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppTheme.accentPurple,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Generación de Foto con IA',
                      style: GoogleFonts.montserrat(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark
                            ? AppTheme.textPrimaryDark
                            : AppTheme.textPrimaryLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Copia el prompt fotográfico profesional generado especialmente para "${menu.name}" y pégalo en tu generador de imágenes favorito (Midjourney, DALL-E, Pollinations).',
                  style: GoogleFonts.montserrat(
                    fontSize: 12,
                    color: AppTheme.textSecondaryLight,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _copyAiPrompt,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryPurple,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.copy_rounded, size: 18),
                    label: Text(
                      'Copiar Prompt de Imagen',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoPhotoPlaceholder(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.camera_alt_rounded,
                color: AppTheme.primaryPurple,
                size: 40,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Sin Foto del Menú',
              style: GoogleFonts.montserrat(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: isDark
                    ? AppTheme.textPrimaryDark
                    : AppTheme.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Aún no hay foto cargada para este menú.',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                color: AppTheme.textSecondaryLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// MODAL: AGREGAR INGREDIENTE (CON BÚSQUEDA EN CATÁLOGO /api/foods)
// =============================================================================
class _AddMenuItemModal extends StatefulWidget {
  final String menuId;
  final VoidCallback onItemAdded;

  const _AddMenuItemModal({
    required this.menuId,
    required this.onItemAdded,
  });

  @override
  State<_AddMenuItemModal> createState() => _AddMenuItemModalState();
}

class _AddMenuItemModalState extends State<_AddMenuItemModal> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _qtyController = TextEditingController(text: '100');
  final TextEditingController _portionLabelController =
      TextEditingController();

  List<FoodItemModel> _searchResults = [];
  FoodItemModel? _selectedFood;
  String _selectedUnit = 'g';
  bool _isSearching = false;
  bool _isSubmitting = false;
  Timer? _debounce;

  static const List<String> _units = [
    'g',
    'ml',
    'unidad',
    'taza',
    'cucharada',
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialFoods();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _qtyController.dispose();
    _portionLabelController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialFoods() async {
    setState(() => _isSearching = true);
    try {
      final list = await _nutritionService.getFoodCatalog();
      if (mounted) {
        setState(() {
          _searchResults = list;
          _isSearching = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  void _onSearchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _isSearching = true);
      try {
        final list = await _nutritionService.getFoodCatalog(query: text.trim());
        if (mounted) {
          setState(() {
            _searchResults = list;
            _isSearching = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _isSearching = false);
      }
    });
  }

  Future<void> _submit() async {
    if (_selectedFood == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Selecciona un alimento de la lista',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: AppTheme.errorRed,
        ),
      );
      return;
    }

    final qty = double.tryParse(_qtyController.text.trim()) ?? 0;
    if (qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Ingresa una cantidad válida mayor a 0',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: AppTheme.errorRed,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await _nutritionService.addMenuItem(
        widget.menuId,
        {
          'foodId': _selectedFood!.id,
          'quantity': qty,
          'unit': _selectedUnit,
          if (_portionLabelController.text.trim().isNotEmpty)
            'portionLabel': _portionLabelController.text.trim(),
        },
      );

      if (mounted) {
        Navigator.of(context).pop();
        widget.onItemAdded();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Error al agregar ingrediente: ${e.toString()}',
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
      height: MediaQuery.of(context).size.height * 0.85,
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
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
          const SizedBox(height: 12),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: AppTheme.primaryPurple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.add_circle_outline_rounded,
                  color: AppTheme.primaryPurple,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Agregar Ingrediente',
                style: GoogleFonts.montserrat(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Search Field
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.bgDark : AppTheme.bgLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
              ),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar alimento en base SMAE...',
                hintStyle: GoogleFonts.montserrat(
                  fontSize: 13,
                  color: AppTheme.textSecondaryLight,
                ),
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _loadInitialFoods();
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Results list (scrollable)
          Expanded(
            child: _isSearching
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppTheme.primaryPurple,
                      strokeWidth: 2.5,
                    ),
                  )
                : _searchResults.isEmpty
                    ? Center(
                        child: Text(
                          'No se encontraron alimentos',
                          style: GoogleFonts.montserrat(
                            fontSize: 13,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                      )
                    : ListView.separated(
                        itemCount: _searchResults.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 6),
                        itemBuilder: (context, index) {
                          final food = _searchResults[index];
                          final isSelected = _selectedFood?.id == food.id;

                          return InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () {
                              setState(() {
                                _selectedFood = food;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primaryPurple
                                        .withValues(alpha: 0.12)
                                    : (isDark
                                        ? AppTheme.bgDark
                                        : AppTheme.bgLight),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected
                                      ? AppTheme.primaryPurple
                                      : (isDark
                                          ? AppTheme.borderDark
                                          : AppTheme.borderLight),
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          food.name,
                                          style: GoogleFonts.montserrat(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: isDark
                                                ? AppTheme.textPrimaryDark
                                                : AppTheme.textPrimaryLight,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          '${food.kcal.toStringAsFixed(0)} kcal · P: ${food.protein}g · C: ${food.carbs}g · G: ${food.fat}g',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 11,
                                            color: AppTheme.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    const Icon(
                                      Icons.check_circle_rounded,
                                      color: AppTheme.primaryPurple,
                                      size: 20,
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          const SizedBox(height: 12),

          // Inputs for Quantity, Unit, Portion Label
          if (_selectedFood != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.bgDark : AppTheme.bgLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Quantity input
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Cantidad',
                              style: GoogleFonts.montserrat(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _qtyController,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              decoration: InputDecoration(
                                isDense: true,
                                filled: true,
                                fillColor:
                                    isDark ? AppTheme.cardDark : Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 8,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Unit selector
                      Expanded(
                        flex: 3,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Unidad',
                              style: GoogleFonts.montserrat(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            DropdownButtonFormField<String>(
                              initialValue: _selectedUnit,
                              isDense: true,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor:
                                    isDark ? AppTheme.cardDark : Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 6,
                                ),
                              ),
                              items: _units.map((u) {
                                return DropdownMenuItem(
                                  value: u,
                                  child: Text(
                                    u,
                                    style: GoogleFonts.montserrat(fontSize: 12),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedUnit = val);
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Portion label
                  Text(
                    'Etiqueta de Porción (Opcional)',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _portionLabelController,
                    decoration: InputDecoration(
                      hintText: 'Ej. 1 filete mediano, 1/2 taza',
                      hintStyle: GoogleFonts.montserrat(fontSize: 12),
                      isDense: true,
                      filled: true,
                      fillColor: isDark ? AppTheme.cardDark : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Submit button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryPurple,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _isSubmitting || _selectedFood == null ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Agregar al Menú',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// MODAL: AGREGAR CONDIMENTO (CON BÚSQUEDA Y FALLBACK)
// =============================================================================
class _AddMenuCondimentModal extends StatefulWidget {
  final String menuId;
  final VoidCallback onCondimentAdded;

  const _AddMenuCondimentModal({
    required this.menuId,
    required this.onCondimentAdded,
  });

  @override
  State<_AddMenuCondimentModal> createState() => _AddMenuCondimentModalState();
}

class _AddMenuCondimentModalState extends State<_AddMenuCondimentModal> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _qtyController = TextEditingController(text: '5');

  List<Map<String, dynamic>> _condimentResults = [];
  Map<String, dynamic>? _selectedCondiment;
  String _selectedUnit = 'g';
  bool _isLoading = false;
  bool _isSubmitting = false;

  static const List<Map<String, String>> _fallbackCondiments = [
    {'id': 'c-1', 'name': 'Canela en polvo'},
    {'id': 'c-2', 'name': 'Orégano seco'},
    {'id': 'c-3', 'name': 'Pimienta negra molida'},
    {'id': 'c-4', 'name': 'Jengibre fresco rallado'},
    {'id': 'c-5', 'name': 'Vinagre de manzana'},
    {'id': 'c-6', 'name': 'Jugo de limón natural'},
    {'id': 'c-7', 'name': 'Ajo en polvo'},
    {'id': 'c-8', 'name': 'Mostaza dijon'},
    {'id': 'c-9', 'name': 'Cúrcuma en polvo'},
    {'id': 'c-10', 'name': 'Albahaca seca'},
    {'id': 'c-11', 'name': 'Romero'},
  ];

  @override
  void initState() {
    super.initState();
    _loadCondiments();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _qtyController.dispose();
    super.dispose();
  }

  Future<void> _loadCondiments() async {
    setState(() => _isLoading = true);
    try {
      final res = await _nutritionService.getCondiments(
        q: _searchController.text.trim(),
      );
      if (mounted) {
        if (res.isNotEmpty) {
          setState(() {
            _condimentResults = res;
            _isLoading = false;
          });
        } else {
          // Usar fallback
          final q = _searchController.text.toLowerCase().trim();
          final filtered = _fallbackCondiments
              .where((c) => q.isEmpty || c['name']!.toLowerCase().contains(q))
              .map((c) => Map<String, dynamic>.from(c))
              .toList();
          setState(() {
            _condimentResults = filtered;
            _isLoading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _condimentResults =
              _fallbackCondiments.map((c) => Map<String, dynamic>.from(c)).toList();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    if (_selectedCondiment == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Selecciona un condimento',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: AppTheme.errorRed,
        ),
      );
      return;
    }

    final qty = double.tryParse(_qtyController.text.trim());

    setState(() => _isSubmitting = true);

    try {
      await _nutritionService.addMenuCondiment(
        widget.menuId,
        {
          'condimentId': _selectedCondiment!['id'],
          if (qty != null && qty > 0) 'quantity': qty,
          'unit': _selectedUnit,
        },
      );

      if (mounted) {
        Navigator.of(context).pop();
        widget.onCondimentAdded();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Error al agregar condimento: ${e.toString()}',
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
      height: MediaQuery.of(context).size.height * 0.75,
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.cardDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          const SizedBox(height: 12),

          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.eco_rounded,
                  color: Color(0xFF10B981),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Agregar Condimento / Especia',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark
                      ? AppTheme.textPrimaryDark
                      : AppTheme.textPrimaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Search Field
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.bgDark : AppTheme.bgLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
              ),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _loadCondiments(),
              decoration: InputDecoration(
                hintText: 'Buscar condimento o especia...',
                hintStyle: GoogleFonts.montserrat(
                  fontSize: 13,
                  color: AppTheme.textSecondaryLight,
                ),
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Condiments list
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF10B981),
                      strokeWidth: 2.5,
                    ),
                  )
                : ListView.separated(
                    itemCount: _condimentResults.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      final cond = _condimentResults[index];
                      final isSelected =
                          _selectedCondiment?['id'] == cond['id'];

                      return InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () {
                          setState(() => _selectedCondiment = cond);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF10B981)
                                    .withValues(alpha: 0.12)
                                : (isDark
                                    ? AppTheme.bgDark
                                    : AppTheme.bgLight),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF10B981)
                                  : (isDark
                                      ? AppTheme.borderDark
                                      : AppTheme.borderLight),
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(
                                cond['name'] ?? '',
                                style: GoogleFonts.montserrat(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isDark
                                      ? AppTheme.textPrimaryDark
                                      : AppTheme.textPrimaryLight,
                                ),
                              ),
                              const Spacer(),
                              if (isSelected)
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: Color(0xFF10B981),
                                  size: 20,
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          const SizedBox(height: 12),

          // Quantity & unit row
          if (_selectedCondiment != null) ...[
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cantidad',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _qtyController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          isDense: true,
                          filled: true,
                          fillColor: isDark ? AppTheme.cardDark : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Unidad',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedUnit,
                        isDense: true,
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: isDark ? AppTheme.cardDark : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                        ),
                        items: ['g', 'ml', 'cdta', 'cda', 'al gusto'].map((u) {
                          return DropdownMenuItem(
                            value: u,
                            child: Text(
                              u,
                              style: GoogleFonts.montserrat(fontSize: 12),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedUnit = val);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed:
                  _isSubmitting || _selectedCondiment == null ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Agregar Condimento',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
