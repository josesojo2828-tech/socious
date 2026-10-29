import type { SidebarItem } from "@/types/backend/dashboard.type";

export interface SidebarGroup {
  label: string;
  icon: string;
  paths: string[];
}

/**
 * Configuración de grupos para el sidebar del admin.
 * Los items del backend que matcheen con algún grupo se renderizan
 * dentro de un acordeón colapsable. Los que no matcheen quedan sueltos.
 */
export const sidebarGroups: SidebarGroup[] = [
  {
    label: "Usuarios",
    icon: "users",
    paths: [
      "/dashboard/users",
      "/dashboard/permits",
      "/dashboard/campus",
      "/dashboard/wallets",
      "/dashboard/wallet",
      "/dashboard/users/subscriptions",
      "/dashboard/users/payment-methods",
      "/dashboard/users/feedback",
    ],
  },
  {
    label: "Nutrición",
    icon: "food",
    paths: [
      "/dashboard/patients",
      "/dashboard/foods",
      "/dashboard/condiments",
      "/dashboard/menu",
      "/dashboard/exchange-food",
      "/dashboard/exchange-list",
      "/dashboard/diets",
      "/dashboard/plans",
      "/dashboard/referrals",
      "/dashboard/organization",
      "/dashboard/institutional",
    ],
  },
  {
    label: "Mi Salud",
    icon: "heart-pulse",
    paths: [
      "/dashboard/patient",
    ],
  },
  {
    label: "Aplicación",
    icon: "settings",
    paths: [
      "/dashboard/transactions",
      "/dashboard/payment-methods",
      "/dashboard/subscription",
      "/dashboard/universities",
      "/dashboard/admin/countries",
      "/dashboard/admin/settings",
    ],
  },
];

function itemBelongsToGroup(item: SidebarItem, group: SidebarGroup): boolean {
  if (!item || !item.link) return false;
  const cleanLink = item.link.replace(/\/+$/, "");
  return group.paths.some(
    (p) => cleanLink === p || cleanLink.startsWith(p + "/"),
  );
}

export interface GroupedItems {
  solo: SidebarItem[];
  grouped: Array<{ group: SidebarGroup; items: SidebarItem[] }>;
}

/**
 * Toma los items planos del backend y los separa en dos categorías:
 * - `grouped`: items que matchean con algún grupo (se renderizan en acordeón)
 * - `solo`: items que no matchean ningún grupo (se renderizan sueltos)
 */
export function groupSidebarItems(items: SidebarItem[]): GroupedItems {
  const result: GroupedItems = {
    solo: [],
    grouped: sidebarGroups.map((g) => ({ group: g, items: [] })),
  };

  const matched = new Set<SidebarItem>();

  for (const item of items) {
    let assigned = false;
    for (const entry of result.grouped) {
      if (itemBelongsToGroup(item, entry.group)) {
        entry.items.push(item);
        matched.add(item);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      result.solo.push(item);
    }
  }

  // Filtrar grupos vacíos
  result.grouped = result.grouped.filter((g) => g.items.length > 0);

  return result;
}
