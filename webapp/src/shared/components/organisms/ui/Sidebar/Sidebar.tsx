"use client";

import { Fragment, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  LogOut,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useSidebarStore } from "@/shared/store/ui/useSidebarStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useWorkspaceRole } from "@/shared/hooks/useWorkspaceRole";
import { clsx } from "clsx";
import { useTranslation } from "@/context/i18n.context";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { slugify } from "@/shared/lib/utils";
import type { SidebarProps } from "./Sidebar.types";

/**
 * Northpeak-style rail (round 3 restyle):
 * light `#fbfbfc` / dark `#111317`, neutral rows with a #e8eaee active state,
 * uppercase micro group heads, teal `#1d6f8c` as the single accent. The
 * backend still drives sections/items; only the skin changed.
 */

const iconMap: Record<string, LucideIcon> = {
  dashboard: LucideIcons.LayoutDashboard,
  user: LucideIcons.User,
  users: LucideIcons.Users,
  "people-fill": LucideIcons.Users,
  people: LucideIcons.Users,
  calendar: LucideIcons.Calendar,
  menu: LucideIcons.Utensils,
  exchange: LucideIcons.Shuffle,
  database: LucideIcons.Database,
  food: LucideIcons.Apple,
  apple: LucideIcons.Apple,
  lock: LucideIcons.Lock,
  wallet: LucideIcons.Wallet,
  archive: LucideIcons.Archive,
  "credit-card": LucideIcons.CreditCard,
  "credit-card-fill": LucideIcons.CreditCard,
  fingerprint: LucideIcons.Fingerprint,
  "clipboard2-data-fill": LucideIcons.ClipboardList,
  calculator: LucideIcons.Calculator,
  settings: LucideIcons.Settings,
  store: LucideIcons.Store,
  megaphone: LucideIcons.Megaphone,
  "heart-pulse": LucideIcons.HeartPulse,
  "file-earmark-person": LucideIcons.User,
  "file-earmark-text": LucideIcons.FileText,
  activity: LucideIcons.Activity,
  globe: LucideIcons.Globe,
  message: LucideIcons.MessageSquare,
  permit: LucideIcons.ShieldCheck,
  building: LucideIcons.Building2,
  "arrow-left-right": LucideIcons.ArrowLeftRight,
  droplet: LucideIcons.Droplet,
  mortarboard: LucideIcons.GraduationCap,
  "shopping-bag": LucideIcons.ShoppingBag,
  folder: LucideIcons.Folder,
  "arrows-down-up": LucideIcons.ArrowUpDown,
  truck: LucideIcons.Truck,
  adminstration: LucideIcons.ShieldAlert,
};

/**
 * Color por sección (round 4): cada grupo del rail lleva su tinte — icono
 * coloreado en reposo y fondo suave del mismo tono en el activo. El ciclo es
 * determinista por índice para que no cambie entre renders.
 */
const SECTION_HUES = [
  {
    icon: "text-indigo-500 dark:text-indigo-400",
    dot: "bg-indigo-500",
    active:
      "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
    bar: "shadow-[inset_2px_0_0_0_#6366f1]",
    activeIcon: "text-indigo-600 dark:text-indigo-300",
  },
  {
    icon: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    active:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    bar: "shadow-[inset_2px_0_0_0_#10b981]",
    activeIcon: "text-emerald-600 dark:text-emerald-300",
  },
  {
    icon: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    active:
      "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    bar: "shadow-[inset_2px_0_0_0_#0ea5e9]",
    activeIcon: "text-sky-600 dark:text-sky-300",
  },
  {
    icon: "text-amber-500 dark:text-amber-400",
    dot: "bg-amber-500",
    active:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    bar: "shadow-[inset_2px_0_0_0_#f59e0b]",
    activeIcon: "text-amber-600 dark:text-amber-300",
  },
  {
    icon: "text-rose-500 dark:text-rose-400",
    dot: "bg-rose-500",
    active:
      "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    bar: "shadow-[inset_2px_0_0_0_#f43f5e]",
    activeIcon: "text-rose-600 dark:text-rose-300",
  },
  {
    icon: "text-violet-500 dark:text-violet-400",
    dot: "bg-violet-500",
    active:
      "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    bar: "shadow-[inset_2px_0_0_0_#8b5cf6]",
    activeIcon: "text-violet-600 dark:text-violet-300",
  },
  {
    icon: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
    active:
      "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
    bar: "shadow-[inset_2px_0_0_0_#06b6d4]",
    activeIcon: "text-cyan-600 dark:text-cyan-300",
  },
  {
    icon: "text-orange-500 dark:text-orange-400",
    dot: "bg-orange-500",
    active:
      "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    bar: "shadow-[inset_2px_0_0_0_#f97316]",
    activeIcon: "text-orange-600 dark:text-orange-300",
  },
] as const;

type SectionHue = (typeof SECTION_HUES)[number];

/** Hash determinista (FNV-ish) título → índice de la paleta. */
function sectionHue(title: string): SectionHue {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return SECTION_HUES[hash % SECTION_HUES.length];
}

function SidebarLink({
  item,
  hue,
  isCollapsed,
  pathname,
  close,
}: {
  item: { title: string; icon: string; link: string };
  hue: SectionHue;
  isCollapsed: boolean;
  pathname: string | null;
  close: () => void;
}) {
  const safePathname = (pathname || "").replace(/\/$/, "");
  const safeLink = (item?.link || "").replace(/\/$/, "");
  const isActive = safePathname !== "" && safePathname === safeLink;
  const IconComponent = iconMap[item?.icon] || LucideIcons.FileText;
  const { t } = useTranslation();

  return (
    <InternalLink
      href={item?.link || "#"}
      onClick={close}
      title={isCollapsed ? t(item?.title || "") : undefined}
      className={clsx(
        "flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] group mb-px",
        "focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:-outline-offset-2",
        isCollapsed && "justify-center px-0",
        isActive
          ? `font-medium ${hue.active} ${hue.bar}`
          : "text-[#575d67] hover:bg-[#f1f2f5] hover:text-[#171a1f] dark:text-[#9aa1ad] dark:hover:bg-[#1b1e24] dark:hover:text-white",
      )}
    >
      <IconComponent
        size={17}
        className={clsx(
          "flex-shrink-0 transition-colors duration-150",
          isActive ? hue.activeIcon : hue.icon,
        )}
      />
      {!isCollapsed && (
        <span className="flex-1 min-w-0 truncate text-left">
          {t(item?.title || "")}
        </span>
      )}
    </InternalLink>
  );
}

const SIDEBAR_SECTION_STORAGE_PREFIX = "nutringest_sidebar_section_";
const SIDEBAR_SECTION_TOGGLE_EVENT = "nutringest:sidebar-section-toggle";

function getSectionStorageKey(sectionKey: string) {
  return `${SIDEBAR_SECTION_STORAGE_PREFIX}${sectionKey}`;
}

function readSectionOpen(sectionKey: string) {
  try {
    return localStorage.getItem(getSectionStorageKey(sectionKey)) !== "false";
  } catch {
    return true;
  }
}

function SidebarSection({
  sectionKey,
  title,
  items,
  hue,
  isCollapsed,
  pathname,
  close,
}: {
  sectionKey: string;
  title: string;
  items: { title: string; icon: string; link: string }[];
  hue: SectionHue;
  isCollapsed: boolean;
  pathname: string | null;
  close: () => void;
}) {
  const { t } = useTranslation();

  // Persistencia en localStorage leída como store externo: evita mismatch de
  // hidratación (SSR asume expandido) y setState dentro de effects.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (
          e.key === null ||
          e.key === getSectionStorageKey(sectionKey)
        ) {
          onStoreChange();
        }
      };
      const onToggle = () => onStoreChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(SIDEBAR_SECTION_TOGGLE_EVENT, onToggle);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(SIDEBAR_SECTION_TOGGLE_EVENT, onToggle);
      };
    },
    [sectionKey],
  );

  const getSnapshot = useCallback(() => readSectionOpen(sectionKey), [sectionKey]);

  // Default EXPANDED (server y primer render cliente).
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, () => true);

  const toggle = () => {
    try {
      localStorage.setItem(
        getSectionStorageKey(sectionKey),
        String(!isOpen),
      );
    } catch {
      // Ignorar fallos de persistencia
    }
    window.dispatchEvent(new Event(SIDEBAR_SECTION_TOGGLE_EVENT));
  };

  const headerId = `sidebar-section-header-${sectionKey}`;
  const panelId = `sidebar-section-panel-${sectionKey}`;

  // Modo icon-only: sin header de acordeón, solo los links colapsados.
  if (isCollapsed) {
    return (
      <>
        {(items || []).map((item) => (
          <SidebarLink
            key={item?.link || item?.title}
            item={item}
            hue={hue}
            isCollapsed
            pathname={pathname}
            close={close}
          />
        ))}
      </>
    );
  }

  return (
    <div className="mb-5 last:mb-0">
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
        className="flex items-center gap-[7px] w-full h-[26px] px-2 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[#767d89] hover:text-[#575d67] dark:text-[#7d848f] dark:hover:text-[#aab0ba] transition-colors cursor-pointer border-0 bg-transparent rounded-[7px]"
      >
        <ChevronDown
          size={12}
          strokeWidth={2.4}
          className={clsx(
            "transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className={clsx("w-1.5 h-1.5 rounded-full flex-none", hue.dot)} />
        <span className="truncate">{t(title)}</span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={clsx(
          "grid transition-all duration-300 ease-in-out",
          isOpen
            ? "grid-rows-[1fr] opacity-100 mt-px"
            : "grid-rows-[0fr] opacity-0 mt-0",
        )}
      >
        <div className="overflow-hidden">
          {(items || []).map((item) => (
            <SidebarLink
              key={item?.link || item?.title}
              item={item}
              hue={hue}
              isCollapsed={false}
              pathname={pathname}
              close={close}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Sidebar = ({ sidebar: customSidebar }: SidebarProps = {}) => {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebarStore();
  const { sidebar: storeSidebar } = useAuthStore();
  const sidebar = customSidebar !== undefined ? customSidebar : storeSidebar;
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { currentRole, isGlobalAdmin } = useWorkspaceRole();
  const { t } = useTranslation();
  const isPatient = user?.permits?.name === "PATIENT";

  // Resetear collapsed al cambiar de desktop → mobile (orientación o resize)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        // Viewport cayó debajo de md: resetear collapsed
        useSidebarStore.setState({ isCollapsed: false });
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // "Nueva venta" solo en contextos de negocio reales: org activa, sin admin
  // global ni paciente.
  const showCreate =
    activeWorkspace?.type === "ORGANIZATION" && !isGlobalAdmin && !isPatient;

  // Secciones visibles calculadas fuera del JSX (puras): el divisor entre
  // grupos sale del índice, sin contadores mutantes en render.
  const navSections = (sidebar || [])
    .map((section, idx) => {
      const items = (section?.items || []).filter((subItem) => {
        const link = subItem?.link || "";
        const title = subItem?.title || "";

        if (isPatient) {
          const forbiddenPatientLinks = [
            '/dashboard/patients',
            '/dashboard/menu',
            '/dashboard/diets',
            '/dashboard/foods',
            '/dashboard/exchange-list',
            '/dashboard/exchange-food',
            '/dashboard/condiments',
            '/dashboard/institutional',
            '/dashboard/subscription',
            '/dashboard/organization',
            '/dashboard/community',
            '/dashboard/campus',
            '/dashboard/marketplace',
            '/dashboard/adoption',
            '/dashboard/activity',
            '/dashboard/users',
            '/dashboard/permits',
            '/dashboard/transactions',
            '/dashboard/wallets',
          ];
          if (forbiddenPatientLinks.some((forbidden) => link.startsWith(forbidden))) {
            return false;
          }
        }

        if (activeWorkspace?.type === "PERSONAL") {
          if (
            link.includes('/dashboard/organization') ||
            title.toLowerCase().includes('clínica') ||
            title.toLowerCase().includes('clinica')
          ) {
            return false;
          }
        }
        return true;
      });

      if (items.length === 0) return null;

      const sectionKey =
        slugify(section?.title || "") ||
        slugify(section?.icon || "") ||
        `section-${idx}`;

      return { section, idx, items, sectionKey };
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null,
    );

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={close}
        />
      )}

      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out md:static md:shadow-none print:hidden shadow-xl",
          "bg-[#fbfbfc] text-[#171a1f] border-r border-[#e5e7ec]",
          "dark:bg-[#111317] dark:text-[#e7eaef] dark:border-[#22252c]",
          isCollapsed ? "md:w-[72px]" : "md:w-[250px]",
          "w-[250px]",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Proj row: marca + contexto (estilo .proj de Northpeak) */}
          <div className="flex flex-col flex-shrink-0 px-3 pt-3.5 pb-3 border-b border-[#e5e7ec] dark:border-[#22252c]">
            <InternalLink
              href="/"
              className={clsx(
                "flex items-center gap-[11px] w-full py-1 rounded-[7px] text-left transition-colors hover:bg-[#f1f2f5] dark:hover:bg-[#1b1e24] focus-visible:outline-2 focus-visible:outline-[#1d6f8c]",
                isCollapsed && "justify-center px-0",
              )}
            >
              <span
                className="w-7 h-7 flex-none rounded-lg grid place-items-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_0_0_3px_rgba(99,102,241,0.16)]"
                style={{
                  background: "linear-gradient(155deg,#4f46e5 0%,#3730a3 100%)",
                }}
                aria-label="Socius ERP"
              >
                <span className="text-white font-bold text-sm leading-none">
                  S
                </span>
              </span>
              {!isCollapsed && (
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-semibold leading-tight tracking-[-0.012em] truncate">
                    {activeWorkspace?.name || "Socius ERP"}
                  </b>
                  <span className="block text-xs text-[#767d89] dark:text-[#7d848f] truncate">
                    {activeWorkspace?.type === "ORGANIZATION"
                      ? "Espacio de negocio"
                      : "Espacio personal"}
                    {currentRole ? ` · ${currentRole.replace("CLINIC_", "")}` : ""}
                  </span>
                </span>
              )}
            </InternalLink>

            {/* CTA estilo .create */}
            {showCreate && (
              <InternalLink
                href="/dashboard/pos"
                onClick={close}
                className={clsx(
                  "mt-3 flex items-center gap-2 h-[34px] px-3 rounded-[7px] text-white text-[14.5px] font-semibold tracking-[-0.008em] transition-all",
                  "bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-px active:translate-y-0 shadow-[0_1px_2px_rgba(49,46,129,0.3)]",
                  "focus-visible:outline-2 focus-visible:outline-[#1d6f8c] focus-visible:outline-offset-2",
                  isCollapsed && "justify-center px-0",
                )}
                title={isCollapsed ? "Nueva venta" : undefined}
              >
                <Plus size={15} strokeWidth={2.3} className="flex-none" />
                {!isCollapsed && (
                  <span className="flex-1 text-left">Nueva venta</span>
                )}
              </InternalLink>
            )}
          </div>

          {/* Nav Items */}
          <nav className="sidebar-nav flex-1 py-4 px-3 overflow-y-auto">
            {navSections.map((entry, i) => (
              <Fragment key={entry.section?.icon || entry.section?.title || entry.idx}>
                {i > 0 ? (
                  <div
                    className="h-px bg-[#e5e7ec] dark:bg-[#22252c] mx-1 my-3.5"
                    aria-hidden
                  />
                ) : null}
                <SidebarSection
                  sectionKey={entry.sectionKey}
                  title={entry.section?.title || ""}
                  items={entry.items}
                  hue={sectionHue(entry.section?.title || `section-${entry.idx}`)}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                  close={close}
                />
              </Fragment>
            ))}
          </nav>

          {/* Footer estilo .rail-foot */}
          <div className="mt-auto px-3 pt-3 pb-3 border-t border-[#e5e7ec] dark:border-[#22252c]">
            {/* Feedback */}
            <label
              htmlFor="feedback-drawer"
              title={isCollapsed ? t("common.sidebar.feedback") : undefined}
              className={clsx(
                "flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/25 transition-colors cursor-pointer group",
                isCollapsed && "justify-center px-0",
              )}
            >
              <MessageSquarePlus size={17} className="flex-none text-emerald-600 dark:text-emerald-400" />
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">
                  {t("common.sidebar.feedback")}
                </span>
              )}
            </label>

            {/* Logout */}
            <button
              onClick={() => {
                close();
                logout();
                window.location.href = "/";
              }}
              title={isCollapsed ? t("common.auth.logout") : undefined}
              className={clsx(
                "flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] w-full text-[#575d67] hover:bg-[#fdefef] hover:text-[#b4423a] dark:text-[#9aa1ad] dark:hover:bg-[#2a1618] dark:hover:text-[#e5857c] transition-colors cursor-pointer border-0 bg-transparent",
                isCollapsed && "justify-center px-0",
              )}
            >
              <LogOut size={17} className="flex-none" />
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">
                  {t("common.auth.logout")}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="h-px bg-[#e5e7ec] dark:bg-[#22252c] my-3" />

            {/* Collapse (desktop only) */}
            <button
              onClick={toggleCollapse}
              className={clsx(
                "hidden md:flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] w-full text-[#575d67] hover:bg-[#f1f2f5] hover:text-[#171a1f] dark:text-[#9aa1ad] dark:hover:bg-[#1b1e24] dark:hover:text-white transition-all cursor-pointer border-0 bg-transparent",
                isCollapsed && "justify-center px-0",
              )}
              title={
                isCollapsed
                  ? t("common.sidebar.expand")
                  : t("common.sidebar.collapse")
              }
            >
              {isCollapsed ? (
                <ChevronRight size={17} className="flex-none" />
              ) : (
                <ChevronLeft size={17} className="flex-none" />
              )}
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">
                  {t("common.sidebar.collapse")}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
