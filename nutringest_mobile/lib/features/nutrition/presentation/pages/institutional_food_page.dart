import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/navigation/main_navigation_shell.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../models/institutional_food_model.dart';
import '../../services/nutrition_service.dart';

class InstitutionalFoodPage extends StatefulWidget {
  const InstitutionalFoodPage({super.key});

  @override
  State<InstitutionalFoodPage> createState() => _InstitutionalFoodPageState();
}

class _InstitutionalFoodPageState extends State<InstitutionalFoodPage> {
  final NutritionService _nutritionService = NutritionService();
  final TextEditingController _searchController = TextEditingController();

  String _searchQuery = '';
  int _currentPage = 1;
  int _totalPages = 1;
  static const int _limit = 10;

  bool _isLoading = true;
  List<InstitutionalFoodModel> _menus = [];
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _fetchInstitutionalMenus(page: 1);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchInstitutionalMenus({int page = 1}) async {
    debugPrint('[INSTITUTIONAL_FOOD_PAGE] Load start: page $page, query: "$_searchQuery"');
    setState(() => _isLoading = true);
    try {
      final res = await _nutritionService.getInstitutionalFood(
        page: page,
        limit: _limit,
        q: _searchQuery,
      );

      debugPrint('[INSTITUTIONAL_FOOD_PAGE] Data received: ${res.items.length} menus (page: ${res.currentPage}/${res.totalPages}, total: ${res.total})');
      if (mounted) {
        setState(() {
          _menus = res.items;
          _currentPage = res.currentPage;
          _totalPages = res.totalPages;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('[INSTITUTIONAL_FOOD_PAGE] Catch block error loading institutional menus: $e\n$stack');
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
      _fetchInstitutionalMenus(page: 1);
    });
  }

  void _showCreateInstitutionalDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => const CreateInstitutionalCalculationDialog(),
    ).then((created) {
      if (created == true) {
        _fetchInstitutionalMenus(page: 1);
      }
    });
  }


  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final hasAccess = user == null
        ? true
        : (user.hasInstitutionalFoodAccess ||
            user.hasPremiumAccess ||
            user.isAdmin ||
            user.hasEntitlement('INSTITUTIONAL_FOOD') ||
            user.hasPermission('INSTITUTIONAL_FOOD') ||
            auth.hasInstitutionalFoodAccess);

    if (!hasAccess) {
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
            'Alimentación Colectiva',
            style: GoogleFonts.montserrat(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_rounded, size: 64, color: AppTheme.accentPurple),
                const SizedBox(height: 16),
                Text(
                  'Acceso Restringido',
                  style: GoogleFonts.montserrat(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'El módulo de Alimentación Colectiva (Menús masivos e institucionales) requiere permisos de usuario INSTITUTIONAL_FOOD o una suscripción Premium activa.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.montserrat(
                    fontSize: 14,
                    color: AppTheme.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Volver'),
                ),
              ],
            ),
          ),
        ),
      );
    }

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
          'Alimentación Colectiva',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded),
            tooltip: 'Crear Menú Colectivo',
            onPressed: () => _showCreateInstitutionalDialog(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar menú masivo, hospital u opción...',
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
                : _menus.isEmpty
                    ? _buildEmptyState(context, isDark)
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _menus.length,
                        itemBuilder: (context, index) {
                          final item = _menus[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          item.title,
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
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppTheme.accentPurple.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          item.category,
                                          style: GoogleFonts.montserrat(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.accentPurple,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.groups_rounded, size: 16, color: AppTheme.primaryPurple),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          'Escalado: ${item.targetRations > 0 ? '${item.targetRations} raciones / día' : 'General'}',
                                          style: GoogleFonts.montserrat(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.primaryPurple,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        item.costPerRation,
                                        style: GoogleFonts.montserrat(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.successGreen,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    item.description,
                                    style: GoogleFonts.montserrat(
                                      fontSize: 12,
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

          // Pagination controls if records exist
          if (!_isLoading && _menus.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
              child: _buildPaginationBar(context, _totalPages, isDark),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.cardDark : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? AppTheme.borderDark : AppTheme.borderLight,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppTheme.accentPurple.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.corporate_fare_rounded,
                  size: 38,
                  color: AppTheme.accentPurple,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Sin menús de alimentación colectiva registrados',
                textAlign: TextAlign.center,
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Comienza creando una simulación institucional para gestionar raciones, minutas masivas y costeo por persona.',
                textAlign: TextAlign.center,
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  color: AppTheme.textSecondaryLight,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 22),
              ElevatedButton.icon(
                onPressed: () => _showCreateInstitutionalDialog(context),
                icon: const Icon(Icons.add_rounded, size: 20),
                label: Text(
                  '+ Crear Menú Colectivo',
                  style: GoogleFonts.montserrat(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryPurple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 2,
                ),
              ),
            ],
          ),
        ),
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
                      _fetchInstitutionalMenus(page: _currentPage);
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
                      _fetchInstitutionalMenus(page: _currentPage);
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

class CreateInstitutionalCalculationDialog extends StatefulWidget {
  const CreateInstitutionalCalculationDialog({super.key});

  @override
  State<CreateInstitutionalCalculationDialog> createState() => _CreateInstitutionalCalculationDialogState();
}

class _CreateInstitutionalCalculationDialogState extends State<CreateInstitutionalCalculationDialog> {
  final NutritionService _nutritionService = NutritionService();
  int _step = 1;
  bool _isSubmitting = false;
  String? _errorMsg;

  // Step 1: Basic Info
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _femaleCountController = TextEditingController(text: '69');
  final _maleCountController = TextEditingController(text: '50');

  // Step 2: Weight Sampling
  final _sampleWeightsController = TextEditingController(text: '50, 60, 50, 51, 43, 51, 45, 50, 45');

  // Step 3: Energy & Activity
  String _activityLevel = 'MODERATE';
  final _customFactorController = TextEditingController(text: '30');

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _femaleCountController.dispose();
    _maleCountController.dispose();
    _sampleWeightsController.dispose();
    _customFactorController.dispose();
    super.dispose();
  }

  int get _femaleCount => int.tryParse(_femaleCountController.text) ?? 0;
  int get _maleCount => int.tryParse(_maleCountController.text) ?? 0;
  int get _totalPeople => _femaleCount + _maleCount;

  List<double> get _parsedWeights {
    return _sampleWeightsController.text
        .split(',')
        .map((w) => double.tryParse(w.trim()))
        .whereType<double>()
        .toList();
  }

  double get _averageWeight {
    final weights = _parsedWeights;
    if (weights.isEmpty) return 50.0;
    final sum = weights.reduce((a, b) => a + b);
    return double.parse((sum / weights.length).toStringAsFixed(2));
  }

  double get _activityFactor {
    if (_activityLevel == 'SEDENTARY') return 20.0;
    if (_activityLevel == 'MODERATE') return 30.0;
    if (_activityLevel == 'ACTIVE') return 50.0;
    return double.tryParse(_customFactorController.text) ?? 30.0;
  }

  int get _computedVct {
    final basePoblacional = ((_femaleCount + _maleCount) / 2).round();
    return (basePoblacional * _activityFactor).round();
  }

  void _loadBenchmarkSample() {
    setState(() {
      _sampleWeightsController.text = '50, 60, 50, 51, 43, 51, 45, 50, 45';
    });
  }

  bool _validateCurrentStep() {
    setState(() => _errorMsg = null);
    if (_step == 1) {
      if (_titleController.text.trim().isEmpty) {
        setState(() => _errorMsg = 'El título del cálculo es obligatorio.');
        return false;
      }
      if (_totalPeople <= 0) {
        setState(() => _errorMsg = 'La población total debe ser mayor a 0 personas.');
        return false;
      }
    } else if (_step == 2) {
      if (_parsedWeights.isEmpty) {
        setState(() => _errorMsg = 'Ingresa al menos un peso válido para el muestreo.');
        return false;
      }
    }
    return true;
  }

  Future<void> _submitCalculation() async {
    if (!_validateCurrentStep()) return;

    setState(() {
      _isSubmitting = true;
      _errorMsg = null;
    });

    try {
      await _nutritionService.createInstitutionalCalculation(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        totalPeople: _totalPeople,
        maleCount: _maleCount,
        femaleCount: _femaleCount,
        sampleWeights: _parsedWeights,
        activityLevel: _activityLevel,
        activityFactor: _activityLevel == 'CUSTOM' ? _activityFactor : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Simulación de menú colectivo creada con éxito'),
            backgroundColor: AppTheme.successGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMsg = 'Error al guardar simulación: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cálculo Institucional',
                          style: GoogleFonts.montserrat(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        Text(
                          'Asistente de alimentación colectiva',
                          style: GoogleFonts.montserrat(
                            fontSize: 12,
                            color: AppTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Step Indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.accentPurple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStepChip(1, '1. Datos'),
                    _buildStepChip(2, '2. Muestra'),
                    _buildStepChip(3, '3. VCT'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Error banner
              if (_errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.errorRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.errorRed.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, size: 18, color: AppTheme.errorRed),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMsg!,
                          style: GoogleFonts.montserrat(fontSize: 12, color: AppTheme.errorRed),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // STEP 1: Datos Generales
              if (_step == 1) ...[
                Text(
                  'Título / Nombre del Cálculo *',
                  style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                TextField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: 'Ej: Comedor Escolar La Salle (119 pers.)',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Descripción (Opcional)',
                  style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                TextField(
                  controller: _descriptionController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Ej: Simulación base con menú equilibrado para comedor...',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Cantidad Mujeres',
                            style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          TextField(
                            controller: _femaleCountController,
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Cantidad Hombres',
                            style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          TextField(
                            controller: _maleCountController,
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Población Total:',
                        style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '$_totalPeople personas',
                        style: GoogleFonts.montserrat(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryPurple,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // STEP 2: Weight Sampling
              if (_step == 2) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Muestra de Pesos (kg)',
                      style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      onPressed: _loadBenchmarkSample,
                      child: Text(
                        'Cargar Muestra Benchmark',
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
                TextField(
                  controller: _sampleWeightsController,
                  maxLines: 3,
                  onChanged: (_) => setState(() {}),
                  style: GoogleFonts.firaCode(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Ej: 50, 60, 52, 48, 55',
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Ingresa los pesos separados por comas para calcular el peso promedio grupal.',
                  style: GoogleFonts.montserrat(fontSize: 11, color: AppTheme.textSecondaryLight),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryPurple.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.primaryPurple.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PESO PROMEDIO CALCULADO',
                            style: GoogleFonts.montserrat(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryPurple,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$_averageWeight kg',
                            style: GoogleFonts.montserrat(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryPurple,
                            ),
                          ),
                        ],
                      ),
                      Chip(
                        label: Text(
                          '${_parsedWeights.length} muestras',
                          style: GoogleFonts.montserrat(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        backgroundColor: Colors.white,
                      ),
                    ],
                  ),
                ),
              ],

              // STEP 3: Activity & VCT
              if (_step == 3) ...[
                Text(
                  'Nivel de Actividad Física Colectiva',
                  style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildActivityOption('SEDENTARY', 'Sedentario (20%)'),
                    _buildActivityOption('MODERATE', 'Moderado (30%)'),
                    _buildActivityOption('ACTIVE', 'Activo (50%)'),
                    _buildActivityOption('CUSTOM', 'Personalizado'),
                  ],
                ),
                if (_activityLevel == 'CUSTOM') ...[
                  const SizedBox(height: 12),
                  Text(
                    'Factor de Gasto Personalizado (%)',
                    style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _customFactorController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6C5CE7), Color(0xFFa29bfe)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'VALOR CALÓRICO TOTAL (VCT) ESTIMADO',
                        style: GoogleFonts.montserrat(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white70,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '$_computedVct',
                            style: GoogleFonts.montserrat(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'kcal / día por persona',
                            style: GoogleFonts.montserrat(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '* Fórmulas aplicadas: Base Poblacional (${((_femaleCount + _maleCount) / 2).round()}) × Factor (${_activityFactor.toStringAsFixed(0)}%)',
                        style: GoogleFonts.montserrat(fontSize: 10, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Bottom Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (_step > 1)
                    OutlinedButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => setState(() {
                                _step--;
                                _errorMsg = null;
                              }),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text('Atrás', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                    )
                  else
                    TextButton(
                      onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                      child: Text('Cancelar', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, color: Colors.grey)),
                    ),
                  if (_step < 3)
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        if (_validateCurrentStep()) {
                          setState(() => _step++);
                        }
                      },
                      child: Text('Siguiente', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                    )
                  else
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.successGreen,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _isSubmitting ? null : _submitCalculation,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text('Crear Simulación', style: GoogleFonts.montserrat(fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepChip(int stepNum, String label) {
    final isActive = _step == stepNum;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primaryPurple : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isActive ? Colors.white : AppTheme.primaryPurple,
        ),
      ),
    );
  }

  Widget _buildActivityOption(String key, String label) {
    final isSelected = _activityLevel == key;
    return InkWell(
      onTap: () => setState(() => _activityLevel = key),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryPurple.withValues(alpha: 0.15) : Colors.grey.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.primaryPurple : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? AppTheme.primaryPurple : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

