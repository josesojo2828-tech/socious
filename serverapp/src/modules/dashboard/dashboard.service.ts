import { Injectable } from "@nestjs/common";
import UserReporitory from "../user/repository/user.repository";
import PermitReporitory from "../permit/repository/permit.repository";
import { ModuleService } from "../module-framework/services/module.service";
import { isModuleFrameworkEnabled } from "../module-framework/util/module-framework.flag";
import {
  SidebarItem,
  SidebarSection,
  TabItem,
} from "src/shared/types/dashboard.type";
import { User } from "src/shared/types/schema.types";

@Injectable()
export class DashboardService {
  constructor(
    private userRepository: UserReporitory,
    private permitRepository: PermitReporitory,
    private moduleService: ModuleService,
  ) { }

  async getSidebarSections({ id, permits, modules = [], isPremium = false, isPatient = false, isGlobalRole = false }: { id: string; permits: string[]; modules?: string[]; isPremium?: boolean; isPatient?: boolean; isGlobalRole?: boolean }): Promise<SidebarSection[]> {
    if (!isPatient && (!permits || permits.length === 0)) return [];

    const moduleKeys = new Set(modules);
    const hasModule = (key: string) => moduleKeys.has(key);

    const sections: SidebarSection[] = [];

    if (isGlobalRole) {
      // =========================================================================
      // SECCIONES PARA ADMIN / SUPERADMIN (isGlobalRole)
      // =========================================================================

      // 1. Panel General & Analíticas
      sections.push({
        title: "common.sidebar.general_analytics",
        icon: "dashboard",
        items: [
          {
            title: "common.sidebar.dashboard",
            icon: "clipboard2-data-fill",
            link: "/dashboard",
          },
          {
            title: "common.sidebar.activity_feed",
            icon: "activity",
            link: "/dashboard/activity",
          },
        ],
      });

      // 2. Módulos (UNA sección agrupada para admins — catálogo activo completo).
      //    Los items enlazan al dashboard admin de cada módulo. Se omite la
      //    sección si el catálogo no tiene módulos activos o si el framework
      //    está apagado (task 5.1: `MODULE_FRAMEWORK_ENABLED`).
      const activeModules = isModuleFrameworkEnabled()
        ? await this.moduleService.listActive()
        : [];
      if (activeModules.length > 0) {
        sections.push({
          title: "common.sidebar.modules",
          icon: "grid",
          items: activeModules.map((module) => ({
            title: module.name,
            icon: module.icon ?? "grid",
            link: `/dashboard/admin/modules/${module.key}`,
          })),
        });
      }

      // 3. Gestión de Usuarios
      sections.push({
        title: "common.sidebar.user_management",
        icon: "users",
        items: [
          {
            title: "common.sidebar.users",
            icon: "people-fill",
            link: "/dashboard/users",
          },
          {
            title: "common.sidebar.feedback",
            icon: "message",
            link: "/dashboard/users/feedback",
          },
        ],
      });

      // 3. Configuración de Plataforma
      sections.push({
        title: "common.sidebar.platform_config",
        icon: "settings",
        items: [
          {
            title: "common.sidebar.system_settings",
            icon: "settings",
            link: "/dashboard/admin/settings",
          },
          {
            title: "common.sidebar.countries",
            icon: "globe",
            link: "/dashboard/admin/countries",
          },
          {
            title: "common.sidebar.permits",
            icon: "permit",
            link: "/dashboard/permits",
          },
          {
            title: "common.sidebar.subscription_plans",
            icon: "fingerprint",
            link: "/dashboard/subscription",
          },
          {
            title: "common.sidebar.active_subscriptions",
            icon: "fingerprint",
            link: "/dashboard/users/subscriptions",
          },
        ],
      });

      // 4. Finanzas
      sections.push({
        title: "common.sidebar.finances",
        icon: "wallet",
        items: [
          {
            title: "common.sidebar.transactions",
            icon: "credit-card-fill",
            link: "/dashboard/transactions",
          },
          {
            title: "common.sidebar.wallets",
            icon: "wallet",
            link: "/dashboard/wallets",
          },
          {
            title: "common.sidebar.payment_methods",
            icon: "credit-card",
            link: "/dashboard/users/payment-methods",
          },
        ],
      });
    } else if (isPatient) {
      // =========================================================================
      // SECCIONES EXCLUSIVAS PARA PACIENTE (isPatient)
      // =========================================================================
      sections.push({
        title: "common.sidebar.general_panel",
        icon: "dashboard",
        items: [
          {
            title: "common.sidebar.dashboard",
            icon: "clipboard2-data-fill",
            link: "/dashboard",
          },
        ],
      });
    } else {
      // =========================================================================
      // SECCIONES PARA NUTRICIONISTAS / PERFIL CLÍNICO (!isGlobalRole && !isPatient)
      // =========================================================================

      // 1. Panel General
      sections.push({
        title: "common.sidebar.general_panel",
        icon: "dashboard",
        items: [
          {
            title: "common.sidebar.dashboard",
            icon: "clipboard2-data-fill",
            link: "/dashboard",
          },
        ],
      });

      // 2. Tienda pública (catálogo que ven los clientes finales)
      if (hasModule("INVENTORY") || hasModule("POS")) {
        sections.push({
          title: "common.sidebar.online_store",
          icon: "globe",
          items: [
            {
              title: "common.sidebar.shop",
              icon: "globe",
              link: "/shop",
            },
          ],
        });
      }

      // 2. Operaciones & POS
      const posItems: SidebarItem[] = [
        {
          title: "Punto de Venta (POS)",
          icon: "calculator",
          link: "/dashboard/pos",
        },
        {
          title: "Caja y Turnos",
          icon: "wallet",
          link: "/dashboard/caja",
        },
      ];
      sections.push({
        title: "Punto de Venta",
        icon: "calculator",
        items: posItems,
      });

      // 3. Ventas & Facturación
      const salesItems: SidebarItem[] = [
        {
          title: "Ventas Realizadas",
          icon: "receipt",
          link: "/dashboard/ventas",
        },
      ];
      sections.push({
        title: "Ventas",
        icon: "receipt",
        items: salesItems,
      });

      // 4. Inventario & Catálogo
      const inventoryItems: SidebarItem[] = [
        {
          title: "Productos y Servicios",
          icon: "package",
          link: "/dashboard/productos",
        },
        {
          title: "Categorías",
          icon: "folder",
          link: "/dashboard/categorias",
        },
        {
          title: "Movimientos / Stock",
          icon: "arrows-down-up",
          link: "/dashboard/inventario",
        },
        {
          title: "Proveedores",
          icon: "truck",
          link: "/dashboard/proveedores",
        },
      ];
      sections.push({
        title: "Inventario",
        icon: "package",
        items: inventoryItems,
      });

      // 5. Clientes (CRM)
      const clientItems: SidebarItem[] = [
        {
          title: "Clientes",
          icon: "users",
          link: "/dashboard/clientes",
        },
      ];
      sections.push({
        title: "Clientes",
        icon: "users",
        items: clientItems,
      });
      // 6. Mi Clínica (si aplica)
      if (
        permits.includes("INSTITUTIONAL_FOOD_ACCESS") ||
        hasModule("INSTITUTIONAL_FOOD") ||
        permits.includes("ORGANIZATION_ACCESS") ||
        permits.includes(this.permitRepository.PERMIT_DASHBOARD)
      ) {
        sections.push({
          title: "common.sidebar.my_clinic",
          icon: "building",
          items: [
            {
              title: "common.sidebar.organization",
              icon: "building",
              link: "/dashboard/organization",
            },
          ],
        });
      }
    }

    return sections;
  }

  getTabs({ id, permits, modules = [], isGlobalRole = false }: { id: string; permits: string[]; modules?: string[]; isGlobalRole?: boolean }) {
    const tabs: TabItem[] = [];
    const hasModule = (key: string) => modules.includes(key);

    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_OVERVIEW))
      tabs.push({
        title: "dashboard.tabs.overview",
        icon: "clipboard2-data-fill",
        link: "/dashboard",
      });
    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_ANALYTICS))
      tabs.push({
        title: "dashboard.tabs.analytics",
        icon: "chart-bar-fill",
        link: "/dashboard/analytics",
      });
    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_REPORTS))
      tabs.push({
        title: "dashboard.tabs.reports",
        icon: "file-text-fill",
        link: "/dashboard/reports",
      });
    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_ALERTS))
      tabs.push({
        title: "dashboard.tabs.alerts",
        icon: "bell-fill",
        link: "/dashboard/alerts",
      });
    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_EXPORT))
      tabs.push({
        title: "dashboard.tabs.export",
        icon: "file-arrow-down-fill",
        link: "/dashboard/export",
      });
    if (permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_SETTINGS))
      tabs.push({
        title: "dashboard.tabs.settings",
        icon: "gear-fill",
        link: "/dashboard/settings",
      });
    if (
      permits.includes(this.permitRepository.PERMIT_DASHBOARD_TAB_WEBSITE) ||
      hasModule("INVENTORY") ||
      hasModule("POS") ||
      isGlobalRole
    )
      tabs.push({
        title: "dashboard.tabs.website",
        icon: "globe",
        link: "/dashboard/portfolio",
      });

    if (permits.includes(this.permitRepository.ACTIVITY_FEED))
      tabs.push({
        title: "dashboard.tabs.activity",
        icon: "activity",
        link: "/dashboard/activity",
      });

    // if(permits.includes(this.permitRepository.MY_CURRENT_ACTION_ADMINISTRATION)) tabs.push({ title: 'dashboard.tabs.user_action.administration', icon: 'administration', link: '/dashboard/' });
    // if(permits.includes(this.permitRepository.MY_CURRENT_ACTION_PAYMENT_METHOD)) tabs.push({ title: 'dashboard.tabs.user_action.payment_method', icon: 'payment-method', link: '/dashboard/payment-method' });
    // if(permits.includes(this.permitRepository.MY_CURRENT_ACTION_SUBSCRIPTION)) tabs.push({ title: 'dashboard.tabs.user_action.subscription', icon: 'card-fill', link: '/dashboard/subscription' });
    // if(permits.includes(this.permitRepository.MY_CURRENT_ACTION_WALLET)) tabs.push({ title: 'dashboard.tabs.user_action.wallet', icon: 'wallet-fill', link: '/dashboard/wallet' });

    return tabs;
  }

  getUserTabs({ id, permits }: { id: string; permits: string[] }) {
    const tabs: TabItem[] = [];

    if (
      permits.includes(this.permitRepository.MY_CURRENT_ACTION_ADMINISTRATION)
    )
      tabs.push({
        title: "dashboard.tabs.user_action.administration",
        icon: "administration",
        link: "/dashboard/",
      });
    if (
      permits.includes(this.permitRepository.MY_CURRENT_ACTION_ADMINISTRATION)
    )
      tabs.push({
        title: "dashboard.tabs.user_action.profile",
        icon: "profile",
        link: "/dashboard/profile",
      });

    // Payment method, subscription and wallet tabs removed: those live on
    // sub.nutringest.com now (see ODD `sub-webapp`).

    return tabs;
  }

  getCards() {
    return [
      {
        title: "Dashboard",
        icon: "clipboard2-data-fill",
        link: "/dashboard",
        badge: "New",
        badgeColor: "bg-emerald-100 text-emerald-600",
      },
      {
        title: "Users",
        icon: "people-fill",
        link: "/dashboard/users",
        badge: "New",
        badgeColor: "bg-green-100 text-green-600",
      },
      {
        title: "Files",
        icon: "archive",
        link: "/dashboard/files",
        badge: "New",
        badgeColor: "bg-yellow-100 text-yellow-600",
      },
      // Wallet, Payment Methods and Subscriptions cards removed: those live
      // on sub.nutringest.com now (see ODD `sub-webapp`).
    ];
  }
}
