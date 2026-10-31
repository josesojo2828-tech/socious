"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  LogOut,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useSidebarStore } from "@/shared/store/ui/useSidebarStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useWorkspaceRole } from "@/shared/hooks/useWorkspaceRole";
import { clsx } from "clsx";
import { useTranslation } from "@/context/i18n.context";
import { Image } from "@/shared/components/atoms/Image";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { slugify } from "@/shared/lib/utils";
import type { SidebarProps } from "./Sidebar.types";

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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group mb-1 border-l-4",
        isCollapsed && "justify-center border-l-0 px-2",
        isActive
          ? "bg-indigo-600/80 text-white border-emerald-400 shadow-md shadow-indigo-900/30 font-bold backdrop-blur-xs dark:bg-white/15 dark:text-white dark:border-[#059669]"
          : "text-white/80 border-transparent hover:bg-white/10 hover:text-white dark:text-indigo-200/70 dark:hover:bg-white/10 dark:hover:text-white",
      )}
    >
      <IconComponent
        size={18}
        className={clsx(
          "transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
          isActive
            ? "text-emerald-300 dark:text-[#059669]"
            : "text-white/60 group-hover:text-white dark:text-indigo-300/60 dark:group-hover:text-indigo-100",
        )}
      />
      {!isCollapsed && t(item?.title || "")}
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
    <div>
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
        className="flex items-center justify-between w-full text-[10px] font-extrabold text-white/60 dark:text-indigo-300/40 uppercase tracking-[0.15em] mb-3 px-3 rounded-lg transition-colors cursor-pointer border-0 bg-transparent hover:text-white/90 dark:hover:text-indigo-200/70"
      >
        <span>{t(title)}</span>
        <ChevronDown
          size={14}
          className={clsx(
            "transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={clsx(
          "grid transition-all duration-300 ease-in-out ml-1 border-l border-white/20 dark:border-indigo-950/40",
          isOpen
            ? "grid-rows-[1fr] opacity-100 mt-0.5"
            : "grid-rows-[0fr] opacity-0 mt-0",
        )}
      >
        <div className="overflow-hidden space-y-0.5">
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
  const { logout, user } = useAuthStore();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebarStore();
  const { sidebar: storeSidebar } = useAuthStore();
  const sidebar = customSidebar !== undefined ? customSidebar : storeSidebar;
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { currentRole } = useWorkspaceRole();
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
          "bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155] text-white border-r border-indigo-900/40",
          "dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#334155] dark:text-slate-100 dark:border-indigo-500/20",
          isCollapsed ? "md:w-[72px]" : "md:w-64",
          "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Active Workspace Badge */}
          <div className="flex flex-col border-b border-white/10 dark:border-indigo-500/20 flex-shrink-0">
            <InternalLink
              href={"/"}
              className={clsx(
                "h-16 flex items-center transition-all duration-300",
                isCollapsed ? "justify-center px-2" : "justify-center px-6",
              )}
            >
              <div
                className={clsx(
                  "flex items-center justify-center",
                  isCollapsed ? "w-12 h-12" : "w-16 h-16",
                )}
              >
                <span
                  className={clsx(
                    "flex items-center justify-center rounded-lg bg-indigo-600 font-bold text-white",
                    isCollapsed ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl",
                  )}
                  aria-label="Socius ERP"
                >
                  S
                </span>
              </div>
            </InternalLink>

            {/* Banner de Contexto de Workspace Activo */}
            {!isPatient && !isCollapsed && activeWorkspace && (
              <div className="px-3 pb-3">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 dark:bg-black/30 border border-white/15 dark:border-indigo-800/30 text-xs shadow-xs backdrop-blur-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: activeWorkspace.userColorHex || '#4F46E5' }}
                    />
                    <div className="truncate">
                      <p className="text-[9px] uppercase font-extrabold text-white/70 dark:text-indigo-300/60 leading-tight">
                        {activeWorkspace.type === 'ORGANIZATION' ? '🏥 Modo Clínica' : '👤 Modo Particular'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white dark:text-slate-100 truncate text-xs">{activeWorkspace.name}</p>
                        {currentRole && (
                          <span className="px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded bg-indigo-400/20 dark:bg-indigo-500/20 text-indigo-200 dark:text-indigo-300 border border-indigo-400/30 dark:border-indigo-500/30 shrink-0">
                            {currentRole.replace('CLINIC_', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto" data-tour="sidebar">
            {/* CTA Destacado: Consulta de Bolsillo */}
            {!isPatient && (
              !isCollapsed ? (
                <div className="mb-5 px-1">
                  <InternalLink
                    href="/dashboard/consulta-bolsillo"
                    onClick={close}
                    className={clsx(
                      "relative overflow-hidden group flex items-center justify-between p-3 rounded-2xl transition-all duration-200",
                      "bg-emerald-500/15 hover:bg-emerald-500/25 text-white border border-emerald-500/30 hover:border-emerald-400/50 shadow-sm backdrop-blur-xs active:scale-[0.98]",
                      pathname === "/dashboard/consulta-bolsillo" && "bg-emerald-500/30 border-emerald-400 ring-1 ring-emerald-400 shadow-md shadow-emerald-950/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        <LucideIcons.Zap size={17} className="text-emerald-300" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold tracking-tight leading-tight text-white flex items-center gap-1.5">
                          Consulta de Bolsillo
                        </p>
                        <p className="text-[10px] text-emerald-200/80 font-medium leading-none mt-0.5 truncate">
                          Atención express en 3 pasos
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                      EXPRESS
                    </span>
                  </InternalLink>
                </div>
              ) : (
                <div className="mb-5 flex justify-center">
                  <InternalLink
                    href="/dashboard/consulta-bolsillo"
                    onClick={close}
                    title="Consulta de Bolsillo (Express)"
                    className={clsx(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group",
                      "bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300 hover:text-white active:scale-95",
                      pathname === "/dashboard/consulta-bolsillo" && "bg-emerald-500/30 border-emerald-400 text-white ring-1 ring-emerald-400 shadow-sm"
                    )}
                  >
                    <LucideIcons.Zap size={18} className="text-emerald-300 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-indigo-950"></span>
                    </span>
                  </InternalLink>
                </div>
              )
            )}

            {(sidebar || []).map((section, idx) => {
              const items = section?.items || [];
              if (!items || items.length === 0) return null;

              const filteredItems = items.filter((subItem) => {
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
                    '/dashboard/consulta-bolsillo',
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

                if (activeWorkspace?.type === 'PERSONAL') {
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

              if (filteredItems.length === 0) return null;

              const sectionKey =
                slugify(section?.title || "") ||
                slugify(section?.icon || "") ||
                `section-${idx}`;

              return (
                <div
                  className="mb-6"
                  data-tour={`sidebar-section-${slugify(section?.title || "")}`}
                  key={section?.icon || section?.title || idx}
                >
                  <SidebarSection
                    sectionKey={sectionKey}
                    title={section?.title || ""}
                    items={filteredItems}
                    isCollapsed={isCollapsed}
                    pathname={pathname}
                    close={close}
                  />
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 dark:border-indigo-500/20 space-y-2">
            {/* Collapse Toggle Button (Desktop only) */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex w-full items-center justify-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white dark:text-indigo-300/60 dark:hover:bg-white/5 dark:hover:text-white transition-all cursor-pointer border-0 bg-transparent"
              title={
                isCollapsed
                  ? t("common.sidebar.expand")
                  : t("common.sidebar.collapse")
              }
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
              {!isCollapsed && <span>{t("common.sidebar.collapse")}</span>}
            </button>

            {/* Feedback */}
            {!isCollapsed && (
              <label
                htmlFor="feedback-drawer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40 dark:border-emerald-900/30 transition-all cursor-pointer group"
              >
                <MessageSquarePlus
                  size={20}
                  className="group-hover:scale-110 transition-transform"
                />
                {t("common.sidebar.feedback")}
              </label>
            )}

            {isCollapsed && (
              <label
                htmlFor="feedback-drawer"
                className="flex items-center justify-center px-2 py-2.5 rounded-xl text-emerald-300 hover:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                title={t("common.sidebar.feedback")}
              >
                <MessageSquarePlus size={20} />
              </label>
            )}

            {/* Logout */}
            <button
              onClick={() => {
                close();
                logout();
                window.location.href = "/";
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-950/40 hover:text-red-200 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300 transition-all cursor-pointer border-0 bg-transparent",
                isCollapsed
                  ? "justify-center px-2 py-2.5"
                  : "justify-start px-3 py-2.5",
              )}
              title={isCollapsed ? t("common.auth.logout") : undefined}
            >
              <LogOut size={20} className="text-red-400 dark:text-red-400 flex-shrink-0" />
              {!isCollapsed && t("common.auth.logout")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};