import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';

class SidebarItemModel {
  final String title;
  final String icon;
  final String link;
  final String? badge;
  final String? badgeColor;

  SidebarItemModel({
    required this.title,
    required this.icon,
    required this.link,
    this.badge,
    this.badgeColor,
  });

  factory SidebarItemModel.fromJson(Map<String, dynamic> json) {
    return SidebarItemModel(
      title: json['title'] ?? '',
      icon: json['icon'] ?? '',
      link: json['link'] ?? '',
      badge: json['badge'],
      badgeColor: json['badgeColor'],
    );
  }

  /// Maps i18n keys or backend strings to human readable labels matching web 1:1
  String get displayTitle {
    final Map<String, String> translationMap = {
      'common.sidebar.general_panel': 'Panel General',
      'common.sidebar.dashboard': 'Panel de Control',
      'common.sidebar.web_analytics': 'Mi Web & Analíticas',
      'common.sidebar.portfolio': 'Portafolio Profesional',
      'common.sidebar.clinical_management': 'Gestión Clínica',
      'common.sidebar.consultations': 'Agenda',
      'common.sidebar.patients': 'Pacientes',
      'common.sidebar.nutritional_tools': 'Herramientas Nutricionales',
      'common.sidebar.menu': 'Menús',
      'common.sidebar.exchange': 'Lista de Intercambio',
      'common.sidebar.foods': 'Todos los Alimentos',
      'common.sidebar.exchange_foods': 'Alimentos de Intercambio',
      'common.sidebar.condiments': 'Condimentos',
      'common.sidebar.institutional_food': 'Alimentación Colectiva',
      'common.sidebar.community_network': 'Comunidad & Red',
      'common.sidebar.community': 'Comunidad',
      'common.sidebar.campus': 'Campus',
      'common.sidebar.marketplace': 'Marketplace',
      'Mis Productos': 'Mis Productos',
      'Mis Campañas': 'Mis Campañas',
      'common.sidebar.my_clinic': 'Mi Clínica',
      'common.sidebar.organization': 'Organización',
      'common.sidebar.user_management': 'Gestión de Usuarios',
      'common.sidebar.users': 'Usuarios',
      'common.sidebar.platform_config': 'Configuración',
      'common.sidebar.permits': 'Permisos & Roles',
      'common.sidebar.finances': 'Finanzas',
      'common.sidebar.transactions': 'Transacciones',
      'common.sidebar.wallets': 'Billeteras',
      'common.sidebar.payment_methods': 'Métodos de Pago',
      'common.sidebar.universities': 'Universidades',
      'common.sidebar.subscription_plans': 'Planes de Suscripción',
      'common.sidebar.active_subscriptions': 'Suscripciones Activas',
      'common.sidebar.adoption': 'Panel de Adopción',
      'common.sidebar.activity_feed': 'Feed de Actividad',
      'common.sidebar.marketplace_admin': 'Marketplace Admin',
      'common.sidebar.marketplace_management': 'Administración',
    };

    if (translationMap.containsKey(title)) {
      return translationMap[title]!;
    }
    if (title.startsWith('common.sidebar.')) {
      final part = title.replaceFirst('common.sidebar.', '').replaceAll('_', ' ');
      return part[0].toUpperCase() + part.substring(1);
    }
    return title;
  }

  IconData get iconData {
    final cleanLink = link.toLowerCase().replaceAll(RegExp(r'/+$'), '');
    if (cleanLink == '/dashboard') return Icons.space_dashboard_rounded;
    if (cleanLink.contains('portfolio')) return Icons.language_rounded;
    if (cleanLink.contains('diet') || cleanLink.contains('agenda')) return Icons.calendar_month_rounded;
    if (cleanLink.contains('patient')) return Icons.people_alt_rounded;
    if (cleanLink.contains('menu')) return Icons.restaurant_menu_rounded;
    if (cleanLink.contains('exchange-list')) return Icons.format_list_bulleted_rounded;
    if (cleanLink.contains('exchange-food')) return Icons.swap_horiz_rounded;
    if (cleanLink.contains('condiment')) return Icons.grain_rounded;
    if (cleanLink.contains('food')) return Icons.apple_rounded;
    if (cleanLink.contains('institutional')) return Icons.corporate_fare_rounded;
    if (cleanLink.contains('community')) return Icons.hub_rounded;
    if (cleanLink.contains('campus')) return Icons.school_rounded;
    if (cleanLink.contains('campaign')) return Icons.campaign_rounded;
    if (cleanLink.contains('product')) return Icons.inventory_2_rounded;
    if (cleanLink.contains('market')) return Icons.storefront_rounded;

    final name = icon.toLowerCase();
    if (name.contains('globe')) return Icons.language_rounded;
    if (name.contains('calendar')) return Icons.calendar_month_rounded;
    if (name.contains('user') || name.contains('people')) return Icons.people_alt_rounded;
    if (name.contains('apple') || name.contains('food')) return Icons.apple_rounded;
    if (name.contains('exchange') || name.contains('arrow')) return Icons.swap_horiz_rounded;
    if (name.contains('droplet')) return Icons.grain_rounded;
    if (name.contains('calculator')) return Icons.corporate_fare_rounded;
    if (name.contains('mortarboard') || name.contains('school')) return Icons.school_rounded;
    if (name.contains('shopping') || name.contains('store')) return Icons.storefront_rounded;
    if (name.contains('megaphone')) return Icons.campaign_rounded;
    if (name.contains('clipboard') || name.contains('dashboard')) return Icons.space_dashboard_rounded;
    return Icons.folder_outlined;
  }
}

class SidebarSectionModel {
  final String title;
  final String icon;
  final List<SidebarItemModel> items;

  SidebarSectionModel({
    required this.title,
    required this.icon,
    required this.items,
  });

  factory SidebarSectionModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return SidebarSectionModel(
      title: json['title'] ?? '',
      icon: json['icon'] ?? '',
      items: rawItems
          .map((e) => SidebarItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  String get displayTitle {
    final Map<String, String> translationMap = {
      'common.sidebar.general_panel': 'PANEL GENERAL',
      'common.sidebar.web_analytics': 'MI WEB & ANALÍTICAS',
      'common.sidebar.clinical_management': 'GESTIÓN CLÍNICA',
      'common.sidebar.nutritional_tools': 'HERRAMIENTAS NUTRICIONALES',
      'common.sidebar.community_network': 'COMUNIDAD & RED',
      'common.sidebar.my_clinic': 'MI CLÍNICA',
      'common.sidebar.general_analytics': 'PANEL GENERAL & ANALÍTICAS',
      'common.sidebar.modules': 'MÓDULOS ACTIVOS',
      'common.sidebar.user_management': 'GESTIÓN DE USUARIOS',
      'common.sidebar.finances': 'FINANZAS',
      'common.sidebar.marketplace_admin': 'MARKETPLACE ADMIN',
    };

    if (translationMap.containsKey(title)) {
      return translationMap[title]!;
    }
    if (title.startsWith('common.sidebar.')) {
      final part = title.replaceFirst('common.sidebar.', '').replaceAll('_', ' ');
      return part.toUpperCase();
    }
    return title.toUpperCase();
  }
}

class SidebarProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  List<SidebarSectionModel> _sections = [];
  bool _isLoading = false;
  bool _hasFetched = false;
  String? _errorMessage;

  List<SidebarSectionModel> get sections => _sections.isNotEmpty ? _sections : defaultSections;
  bool get isLoading => _isLoading;
  bool get hasFetched => _hasFetched;
  String? get errorMessage => _errorMessage;

  static List<SidebarSectionModel> get defaultSections => [
    SidebarSectionModel(
      title: 'common.sidebar.general_panel',
      icon: 'dashboard',
      items: [
        SidebarItemModel(
          title: 'common.sidebar.dashboard',
          icon: 'clipboard2-data-fill',
          link: '/dashboard',
        ),
      ],
    ),
    SidebarSectionModel(
      title: 'common.sidebar.web_analytics',
      icon: 'globe',
      items: [
        SidebarItemModel(
          title: 'common.sidebar.portfolio',
          icon: 'globe',
          link: '/dashboard/portfolio',
        ),
      ],
    ),
    SidebarSectionModel(
      title: 'common.sidebar.clinical_management',
      icon: 'users',
      items: [
        SidebarItemModel(
          title: 'common.sidebar.consultations',
          icon: 'calendar',
          link: '/dashboard/diets',
        ),
        SidebarItemModel(
          title: 'common.sidebar.patients',
          icon: 'users',
          link: '/dashboard/patients',
        ),
      ],
    ),
    SidebarSectionModel(
      title: 'common.sidebar.nutritional_tools',
      icon: 'food',
      items: [
        SidebarItemModel(
          title: 'common.sidebar.menu',
          icon: 'menu',
          link: '/dashboard/menu',
        ),
        SidebarItemModel(
          title: 'common.sidebar.exchange',
          icon: 'exchange',
          link: '/dashboard/exchange-list',
        ),
        SidebarItemModel(
          title: 'common.sidebar.foods',
          icon: 'apple',
          link: '/dashboard/foods',
        ),
        SidebarItemModel(
          title: 'common.sidebar.exchange_foods',
          icon: 'arrow-left-right',
          link: '/dashboard/exchange-food',
        ),
        SidebarItemModel(
          title: 'common.sidebar.condiments',
          icon: 'droplet',
          link: '/dashboard/condiments',
        ),
        SidebarItemModel(
          title: 'common.sidebar.institutional_food',
          icon: 'calculator',
          link: '/dashboard/institutional-food',
        ),
      ],
    ),
    SidebarSectionModel(
      title: 'common.sidebar.community_network',
      icon: 'people',
      items: [
        SidebarItemModel(
          title: 'common.sidebar.community',
          icon: 'people',
          link: '/dashboard/community',
        ),
        SidebarItemModel(
          title: 'common.sidebar.campus',
          icon: 'mortarboard',
          link: '/dashboard/campus',
        ),
        SidebarItemModel(
          title: 'common.sidebar.marketplace',
          icon: 'shopping-bag',
          link: '/dashboard/marketplace',
        ),
        SidebarItemModel(
          title: 'Mis Productos',
          icon: 'store',
          link: '/dashboard/marketplace/products',
        ),
        SidebarItemModel(
          title: 'Mis Campañas',
          icon: 'megaphone',
          link: '/dashboard/marketplace/campaigns',
        ),
      ],
    ),
  ];

  SidebarProvider({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient() {
    _sections = defaultSections;
  }

  Future<void> fetchSidebar() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.get('/dashboard/sidebar');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        List rawList = [];
        if (data is Map && data['sections'] is List) {
          rawList = data['sections'] as List;
        } else if (data is List) {
          rawList = data;
        }
        if (rawList.isNotEmpty) {
          _sections = rawList
              .map((s) => SidebarSectionModel.fromJson(s as Map<String, dynamic>))
              .toList();
        }
      }
      _hasFetched = true;
    } catch (e) {
      _errorMessage = 'No se pudo cargar el menú dinámico';
      _hasFetched = true;
      if (_sections.isEmpty) {
        _sections = defaultSections;
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
