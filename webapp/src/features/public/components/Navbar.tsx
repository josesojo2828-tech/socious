"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ChevronDown,
  Globe,
  Settings,
} from "lucide-react";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { ThemeToggle } from "@/shared/components/molecules/ThemeToggle";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useTranslation } from "@/context/i18n.context";

interface NavbarProps {
  activeSection?: string;
}

const SCROLL_THRESHOLD = 24;

const subscribeScroll = (onStoreChange: () => void) => {
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      onStoreChange();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
};

const getScrollSnapshot = () => window.scrollY > SCROLL_THRESHOLD;
const getScrollServerSnapshot = () => false;

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

export const Navbar: React.FC<NavbarProps> = ({ activeSection = "inicio" }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const scrolled = useSyncExternalStore(subscribeScroll, getScrollSnapshot, getScrollServerSnapshot);
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const { user, logout } = useAuthStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { id: "inicio", label: "Inicio", href: "#inicio" },
    { id: "para-quien", label: "Para Quién", href: "#para-quien" },
    { id: "funciones", label: "Funciones", href: "#funciones" },
    { id: "campus", label: "Campus", href: "#campus" },
    { id: "planes", label: "Planes", href: "#planes" },
    { id: "comparativa", label: "Comparativa", href: "#comparativa" },
    { id: "faq", label: "FAQ", href: "#faq" },
  ];

  const userAvatarSrc =
    user?.avatarUrl ||
    user?.profile?.path ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || user?.firstName || "user"}`;

  const displayName = user
    ? user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Usuario"
    : "";

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6 lg:px-12">
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between border px-6 text-base-content transition-[background-color,border-color,box-shadow,padding,margin,border-radius] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${scrolled
          ? "mt-3 rounded-full border-base-300 bg-base-100/80 py-2.5 shadow-lg backdrop-blur-xl"
          : "mt-4 rounded-none border-transparent bg-transparent py-4 shadow-none"
          }`}
      >
        {/* LOGO & BRAND */}
        <InternalLink href="/" className="flex items-center gap-3 group transition-transform active:scale-95">
          <img
            src="/png/IsologoPurpura.png"
            alt="Nutringest Logo"
            className="block w-8 h-auto transition-all duration-300 group-hover:scale-105 dark:hidden"
          />
          <img
            src="/png/IsologoBlanco.png"
            alt=""
            aria-hidden
            className="hidden w-8 h-auto transition-all duration-300 group-hover:scale-105 dark:block"
          />
          <span className="font-display text-xl font-black tracking-tight uppercase bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Nutringest
          </span>
        </InternalLink>

        {/* DESKTOP NAV LINKS */}
        <div
          className={`hidden lg:flex items-center gap-1.5 p-1.5 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${scrolled
            ? "border-base-300 bg-base-200/60"
            : "border-transparent bg-transparent"
            }`}
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 motion-reduce:transition-none ${isActive
                  ? "bg-primary text-primary-content shadow-sm"
                  : "text-base-content/80 hover:bg-base-content/10 hover:text-base-content"
                  }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-3 relative" ref={dropdownRef}>
          <ThemeToggle />
          {mounted && user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-base-300 bg-base-200/60 text-base-content transition-colors hover:bg-base-300 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-base-300 shadow-xs shrink-0">
                  <img src={userAvatarSrc} alt={displayName} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold truncate max-w-[120px]">{displayName}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-base-100/95 backdrop-blur-xl border border-base-300 rounded-2xl shadow-2xl p-2 text-base-content z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-base-200 rounded-xl border border-base-300/60 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                        <img src={userAvatarSrc} alt={displayName} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs text-base-content truncate">{displayName}</p>
                        <p className="text-[10px] text-base-content/60 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <InternalLink
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-base-content/80 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <LayoutDashboard size={16} className="text-primary" />
                      Panel de Control
                    </InternalLink>

                    <InternalLink
                      href="/dashboard/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-base-content/80 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Settings size={16} className="text-accent" />
                      Editar Mi Perfil
                    </InternalLink>

                    {user.username && (
                      <InternalLink
                        href={`/nutri/@${user.username}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-base-content/80 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Globe size={16} className="text-info" />
                        Ver Portafolio Público
                      </InternalLink>
                    )}

                  </div>

                  <hr className="border-base-300 my-2" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-error hover:bg-error/10 rounded-xl transition-all cursor-pointer border-none"
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <InternalLink
                href="/login"
                className="px-4 py-2 font-bold text-xs text-base-content/80 hover:text-base-content transition-colors"
              >
                {t("landing.navbar.login") || "Iniciar sesión"}
              </InternalLink>
              <InternalLink
                href="/register"
                className="group relative inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-extrabold text-xs text-white bg-gradient-to-r from-primary via-accent to-secondary shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 motion-reduce:transition-none"
              >
                <span>{t("landing.navbar.try_free") || "Prueba gratis"}</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </InternalLink>
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <div className="lg:hidden flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-base-content hover:bg-base-content/10 transition-colors cursor-pointer border-none"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <div
        className={`lg:hidden max-w-7xl mx-auto transition-all duration-300 overflow-hidden ${isOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
          }`}
      >
        <div
          className="border border-base-300 rounded-3xl p-6 shadow-2xl space-y-4 bg-base-100/95 backdrop-blur-xl text-base-content"
        >

          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-sm font-bold py-2 px-3 rounded-xl text-base-content/80 hover:text-base-content hover:bg-base-content/10 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          <hr className="border-base-300" />

        </div>
      </div>
    </nav>
  );
};
