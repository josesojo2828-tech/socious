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
 * Maison Lévrier rail (round 4 restyle): pearl `#f0ede4` glass with navy
 * `#1a2a46` ink, brass `#b2944a` as the single accent (active inset bar,
 * head dots, CTA), rose `#c87878` on logout hover, uppercase micro group
 * heads. The backend still drives sections/items; only the skin changed.
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
  briefcase: LucideIcons.Briefcase,
  adminstration: LucideIcons.ShieldAlert,
};

function SidebarLink({
  item,
  isCollapsed,
  pathname,
  close,
}: {
  item: { title: string; icon: string; link: string };
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
        "focus-visible:outline-2 focus-visible:outline-[#b2944a] focus-visible:-outline-offset-2",
        isCollapsed && "justify-center px-0",
        isActive
          ? "bg-[#1a2a46]/[0.07] text-[#111018] shadow-[inset_2px_0_0_0_#b2944a] dark:bg-white/10 dark:text-white"
          : "text-[#1a2a46]/70 hover:bg-[#1a2a46]/[0.05] hover:text-[#111018] dark:text-[#b7b3a8] dark:hover:bg-white/5 dark:hover:text-white",
      )}
    >
      <IconComponent
        size={17}
        className={clsx(
          "flex-shrink-0 transition-colors duration-150",
          isActive
            ? "text-[#b2944a] dark:text-[#d8c084]"
            : "text-[#1a2a46]/55 group-hover:text-[#1a2a46] dark:text-[#b7b3a8] dark:group-hover:text-white",
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
  isCollapsed,
  pathname,
  close,
}: {
  sectionKey: string;
  title: string;
  items: { title: string; icon: string; link: string }[];
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
        className="flex items-center gap-[7px] w-full h-[26px] px-2 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[#1a2a46]/55 hover:text-[#1a2a46] dark:text-[#b7b3a8] dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent rounded-[7px]"
      >
        <ChevronDown
          size={12}
          strokeWidth={2.4}
          className={clsx(
            "transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="w-1.5 h-1.5 rounded-full flex-none bg-[#b2944a]" />
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
  const { logout } = useAuthStore();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebarStore();
  const { sidebar: storeSidebar } = useAuthStore();
  const sidebar = customSidebar !== undefined ? customSidebar : storeSidebar;
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { currentRole, isGlobalAdmin } = useWorkspaceRole();
  const { t } = useTranslation();

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
    activeWorkspace?.type === "ORGANIZATION" && !isGlobalAdmin;

  // Secciones visibles calculadas fuera del JSX (puras): el divisor entre
  // grupos sale del índice, sin contadores mutantes en render.
  const navSections = (sidebar || [])
    .map((section, idx) => {
      const items = (section?.items || []).filter((subItem) => {
        const link = subItem?.link || "";
        const title = subItem?.title || "";


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
          "bg-[#f0ede4]/75 backdrop-blur-xl text-[#1a2a46] border-r border-[#1a2a46]/10",
          "dark:bg-[#12162a]/80 dark:text-[#e6e1d5] dark:border-white/10",
          isCollapsed ? "md:w-[72px]" : "md:w-[250px]",
          "w-[250px]",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Proj row: marca + contexto (estilo .proj de Northpeak) */}
          <div className="flex flex-col flex-shrink-0 px-3 pt-3.5 pb-3 border-b border-[#1a2a46]/10 dark:border-white/10">
            <InternalLink
              href="/"
              className={clsx(
                "flex items-center gap-[11px] w-full py-1 rounded-[7px] text-left transition-colors hover:bg-[#1a2a46]/[0.05] dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#b2944a]",
                isCollapsed && "justify-center px-0",
              )}
            >
              <span
                className="w-7 h-7 flex-none rounded-full grid place-items-center bg-[#1a2a46] shadow-[0_0_0_2px_rgba(178,148,74,0.45)]"
                aria-label="Socius ERP"
              >
                <span className="text-[#f0ede4] font-semibold text-sm leading-none">
                  S
                </span>
              </span>
              {!isCollapsed && (
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-semibold leading-tight tracking-[-0.012em] truncate">
                    {activeWorkspace?.name || "Socius ERP"}
                  </b>
                  <span className="block text-xs text-[#1a2a46]/55 dark:text-[#9a958a] truncate">
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
                  "mt-3 flex items-center gap-2 h-[34px] px-3 rounded-[7px] text-[#111018] text-[14.5px] font-semibold tracking-[-0.008em] transition-all",
                  "bg-[#b2944a] hover:bg-[#bf9f54] hover:-translate-y-px active:translate-y-0 shadow-[0_1px_2px_rgba(178,148,74,0.6)]",
                  "focus-visible:outline-2 focus-visible:outline-[#b2944a] focus-visible:outline-offset-2",
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
                    className="h-px bg-[#1a2a46]/10 dark:bg-white/10 mx-1 my-3.5"
                    aria-hidden
                  />
                ) : null}
                <SidebarSection
                  sectionKey={entry.sectionKey}
                  title={entry.section?.title || ""}
                  items={entry.items}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                  close={close}
                />
              </Fragment>
            ))}
          </nav>

          {/* Footer estilo .rail-foot */}
          <div className="mt-auto px-3 pt-3 pb-3 border-t border-[#1a2a46]/10 dark:border-white/10">
            {/* Feedback */}
            <label
              htmlFor="feedback-drawer"
              title={isCollapsed ? t("common.sidebar.feedback") : undefined}
              className={clsx(
                "flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] text-[#8e7538] bg-[#b2944a]/10 hover:bg-[#b2944a]/20 border border-[#b2944a]/30 dark:text-[#d8c084] dark:bg-[#b2944a]/15 dark:hover:bg-[#b2944a]/25 dark:border-[#b2944a]/30 transition-colors cursor-pointer group",
                isCollapsed && "justify-center px-0",
              )}
            >
              <MessageSquarePlus size={17} className="flex-none text-[#b2944a]" />
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
                "flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] w-full text-[#1a2a46]/70 hover:bg-[#c87878]/15 hover:text-[#a85a5a] dark:text-[#b7b3a8] dark:hover:bg-[#c87878]/15 dark:hover:text-[#e09a9a] transition-colors cursor-pointer border-0 bg-transparent",
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
            <div className="h-px bg-[#1a2a46]/10 dark:bg-white/10 my-3" />

            {/* Collapse (desktop only) */}
            <button
              onClick={toggleCollapse}
              className={clsx(
                "hidden md:flex items-center gap-3 h-9 px-3 rounded-[7px] text-[15px] font-medium tracking-[0.012em] w-full text-[#1a2a46]/70 hover:bg-[#1a2a46]/[0.05] hover:text-[#111018] dark:text-[#b7b3a8] dark:hover:bg-white/5 dark:hover:text-white transition-all cursor-pointer border-0 bg-transparent",
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
