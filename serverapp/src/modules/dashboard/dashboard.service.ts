import { Injectable } from "@nestjs/common";
import UserReporitory from "../user/repository/user.repository";
import PermitReporitory from "../permit/repository/permit.repository";
import { ModuleService } from "../module-framework/services/module.service";
import { isModuleFrameworkEnabled } from "../module-framework/util/module-framework.flag";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
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
    private readonly tenantSettings: TenantSettingsService,
  ) { }

  async getSidebarSections({ id, permits, modules = [], isPremium = false, isGlobalRole = false, organizationId }: { id: string; permits: string[]; modules?: string[]; isPremium?: boolean; isGlobalRole?: boolean; organizationId?: string | null }): Promise<SidebarSection[]> {
    if (!permits || permits.length === 0) return [];

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
            title: "Organizaciones",
            icon: "building",
            link: "/dashboard/admin/organizations",
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
    } else {
      // =========================================================================
      // SECCIONES DEL TENANT (no global)
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

      // 2. Tienda pública (catálogo online, módulo AVANZADO del plan)
      if (hasModule("CATALOG_ONLINE")) {
        sections.push({
          title: "common.sidebar.online_store",
          icon: "globe",
          items: [
            {
              title: "common.sidebar.shop",
              icon: "globe",
              link: "/shop",
            },
            // Ofertas (S9): módulo OFFERS (Avanzado/Premium).
            ...(hasModule("OFFERS")
              ? [
                  {
                    title: "Ofertas",
                    icon: "megaphone",
                    link: "/dashboard/ofertas",
                  },
                ]
              : []),
          ],
        });
      }

      // ERP sections require an organization: without one every mutation
      // answers 403, so the sidebar must not advertise them. The personal
      // context keeps the general panel and the public shop only.
      if (organizationId) {
        const settings = await this.tenantSettings.get(organizationId ?? null);

        // 2. Ventas (agrupa todo lo referente: mostrador, pedidos y caja)
        const salesItems: SidebarItem[] = [
          {
            title: "Punto de Venta (POS)",
            icon: "calculator",
            link: "/dashboard/pos",
          },
          {
            title: "Ventas y devoluciones",
            icon: "receipt",
            link: "/dashboard/ventas",
          },
          // Bandeja de pedidos: módulo ORDERS (AVANZADO+); el POS y las
          // ventas en mostrador son de Básico y no dependen de ella.
          ...(hasModule("ORDERS")
            ? [
                {
                  title: "Bandeja de pedidos",
                  icon: "shopping-bag" as const,
                  link: "/dashboard/pedidos",
                },
              ]
            : []),
          // Sin control de turnos la caja no aparece en el menú (round 2, #4):
          // el turno siempre está abierto y las ventas no lo necesitan.
          ...(settings.cash.shiftControl
            ? [
                {
                  title: "Caja y turnos",
                  icon: "wallet",
                  link: "/dashboard/caja",
                },
              ]
            : []),
        ];
        sections.push({
          title: "Ventas",
          icon: "receipt",
          items: salesItems,
        });

        // 3. CRM (cartera y saldos)
        const crmItems: SidebarItem[] = [
          {
            title: "Clientes",
            icon: "users",
            link: "/dashboard/clientes",
          },
          {
            title: "Proveedores",
            icon: "store",
            link: "/dashboard/proveedores",
          },
          {
            title: "Compras",
            icon: "archive",
            link: "/dashboard/compras",
          },
          {
            title: "Cuentas por cobrar",
            icon: "credit-card",
            link: "/dashboard/cuentas-por-cobrar",
          },
          {
            title: "Cuentas por pagar",
            icon: "credit-card-fill",
            link: "/dashboard/cuentas-por-pagar",
          },
          {
            title: "Finanzas",
            icon: "wallet",
            link: "/dashboard/finanzas",
          },
        ];
        sections.push({
          title: "CRM",
          icon: "users",
          items: crmItems,
        });

        // 4. Inventario & Catálogo (los proveedores viven en el CRM)
        const inventoryItems: SidebarItem[] = [
          {
            title: "Productos y Servicios",
            icon: "package",
            link: "/dashboard/productos",
          },
          {
            title: "Movimientos / Stock",
            icon: "arrows-down-up",
            link: "/dashboard/inventario",
          },
        ];
        sections.push({
          title: "Inventario",
          icon: "package",
          items: inventoryItems,
        });

        // 5b. Rutas de entrega (S8): módulo ROUTES del plan (AVANZADO+) más
        // el check de configuración — sin el check la API también devuelve 409.
        // `settings` was resolved above for the cash title.
        if (hasModule("ROUTES") && settings.routes.enabled) {
          sections.push({
            title: "Rutas de entrega",
            icon: "route",
            items: [
              {
                title: "Rutas de entrega",
                icon: "route",
                link: "/dashboard/rutas",
              },
            ],
          });
        }

        // 5c. Configuración del negocio (S4 del port): los checks viven en
        // /dashboard/configuracion y se leen con GET /api/settings.
        sections.push({
          title: "Configuración",
          icon: "settings",
          items: [
            {
              title: "Configuración del negocio",
              icon: "settings",
              link: "/dashboard/configuracion",
            },
          ],
        });
      }

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
