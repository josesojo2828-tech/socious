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
            title: "common.sidebar.adoption",
            icon: "activity",
            link: "/dashboard/adoption",
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
            title: "common.sidebar.campus_audit",
            icon: "file-earmark-text",
            link: "/dashboard/campus",
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
            title: "common.sidebar.universities",
            icon: "building",
            link: "/dashboard/universities",
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

      // 5. Marketplace Admin
      sections.push({
        title: "common.sidebar.marketplace_admin",
        icon: "store",
        items: [
          {
            title: "common.sidebar.marketplace_management",
            icon: "adminstration",
            link: "/dashboard/marketplace/admin",
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

      // 2. Mi Web & Analíticas
      if (!isPatient && hasModule("PORTFOLIO")) {
        sections.push({
          title: "common.sidebar.web_analytics",
          icon: "globe",
          items: [
            {
              title: "common.sidebar.portfolio",
              icon: "globe",
              link: "/dashboard/portfolio",
            },
          ],
        });
      }

      // 3. Gestión Clínica
      const clinicalItems: SidebarItem[] = [];
      if (
        permits.includes(this.permitRepository.DIET_LIST_OWN) ||
        permits.includes(this.permitRepository.DIET_LIST_ALL) ||
        permits.includes(this.permitRepository.CONSULTATION_LIST_OWN) ||
        permits.includes(this.permitRepository.CONSULTATION_LIST_ALL)
      ) {
        clinicalItems.push({
          title: "common.sidebar.consultations",
          icon: "calendar",
          link: "/dashboard/diets",
        });
      }
      if (
        permits.includes(this.permitRepository.PATIENT_LIST_OWN) ||
        permits.includes(this.permitRepository.PATIENT_LIST_ALL)
      ) {
        clinicalItems.push({
          title: "common.sidebar.patients",
          icon: "users",
          link: "/dashboard/patients",
        });
      }
      if (clinicalItems.length > 0) {
        sections.push({
          title: "common.sidebar.clinical_management",
          icon: "users",
          items: clinicalItems,
        });
      }

      // 4. Herramientas Nutricionales
      const nutritionalItems: SidebarItem[] = [];
      if (
        permits.includes(this.permitRepository.MENU_LIST_OWN) ||
        permits.includes(this.permitRepository.MENU_LIST_ALL) ||
        permits.includes("MENU_LIST")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.menu",
          icon: "menu",
          link: "/dashboard/menu",
        });
      }
      if (
        permits.includes(this.permitRepository.EXCHANGE_LIST_LIST_OWN) ||
        permits.includes(this.permitRepository.EXCHANGE_LIST_LIST_ALL) ||
        permits.includes("EXCHANGE_LIST_LIST")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.exchange",
          icon: "exchange",
          link: "/dashboard/exchange-list",
        });
      }
      if (
        permits.includes(this.permitRepository.FOOD_LIST_OWN) ||
        permits.includes(this.permitRepository.FOOD_LIST_ALL) ||
        permits.includes("FOOD_LIST")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.foods",
          icon: "apple",
          link: "/dashboard/foods",
        });
      }
      if (
        permits.includes(this.permitRepository.FOOD_LIST_OWN) ||
        permits.includes(this.permitRepository.FOOD_LIST_ALL) ||
        permits.includes("FOOD_LIST")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.exchange_foods",
          icon: "arrow-left-right",
          link: "/dashboard/exchange-food",
        });
      }
      if (
        permits.includes(this.permitRepository.CONDIMENT_LIST_OWN) ||
        permits.includes(this.permitRepository.CONDIMENT_LIST_ALL) ||
        permits.includes("CONDIMENT_LIST")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.condiments",
          icon: "droplet",
          link: "/dashboard/condiments",
        });
      }
      if (
        permits.includes("INSTITUTIONAL_FOOD_ACCESS") ||
        hasModule("INSTITUTIONAL_FOOD")
      ) {
        nutritionalItems.push({
          title: "common.sidebar.institutional_food",
          icon: "calculator",
          link: "/dashboard/institutional",
        });
      }
      if (nutritionalItems.length > 0) {
        sections.push({
          title: "common.sidebar.nutritional_tools",
          icon: "food",
          items: nutritionalItems,
        });
      }

      // 5. Comunidad & Red
      const communityItems: SidebarItem[] = [];
      if (!isPatient) {
        if (hasModule("COMMUNITY")) {
          communityItems.push({
            title: "common.sidebar.community",
            icon: "people",
            link: "/dashboard/community",
          });
        }
        communityItems.push({
          title: "common.sidebar.campus",
          icon: "mortarboard",
          link: "/dashboard/campus",
        });
        communityItems.push({
          title: "common.sidebar.marketplace",
          icon: "shopping-bag",
          link: "/dashboard/marketplace",
        });
        if (permits.includes("MARKET_SELLER")) {
          communityItems.push({
            title: "Mis Productos",
            icon: "store",
            link: "/dashboard/marketplace/products",
          });
          communityItems.push({
            title: "Mis Campañas",
            icon: "megaphone",
            link: "/dashboard/marketplace/campaigns",
          });
        }
      }
      if (communityItems.length > 0) {
        sections.push({
          title: "common.sidebar.community_network",
          icon: "people",
          items: communityItems,
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
      hasModule("PORTFOLIO") ||
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

    // Panel de adopción: same audience as the sidebar entry (dashboard permit
    // for org members, role for global admins).
    if (
      permits.includes(this.permitRepository.PERMIT_DASHBOARD) ||
      isGlobalRole
    )
      tabs.push({
        title: "dashboard.tabs.adoption",
        icon: "activity",
        link: "/dashboard/adoption",
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
