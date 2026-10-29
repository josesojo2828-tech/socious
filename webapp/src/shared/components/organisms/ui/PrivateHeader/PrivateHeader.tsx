"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, ChevronDown, User, LogOut, CheckCheck, Clock } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useSidebarStore } from "@/shared/store/ui/useSidebarStore";
import { authStorage } from "@/shared/lib/auth.storage";
import { Avatar } from "@/shared/components/atoms/Avatar";
import { Button } from "@/shared/components/atoms/Button";
import { Text } from "@/shared/components/atoms/Text";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { ThemeToggle } from "@/shared/components/molecules/ThemeToggle";
import { useTranslation } from "@/context/i18n.context";
import { useNotifications } from "@/features/user/hooks/useNotifications";
import { UserNotificationsSection } from "@/features/user/components/sections/UserNotificationSection";
import { WorkspaceSwitcher } from "@/shared/components/layout/WorkspaceSwitcher";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";

// Importaciones de Notificaciones

export const PrivateHeader = () => {
  const { user, logout } = useAuthStore();
  const isPatient = user?.permits?.name === 'PATIENT';
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { t } = useTranslation();
  const { toggle, toggleCollapse } = useSidebarStore();
  const { notifications, fetchNotifications, markAllAsRead } = useNotifications();

  // Polling automático de notificaciones cada 30 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Estados para Dropdowns
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Refs para detectar clics fuera
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Contador de no leídas
  const unreadCount = (notifications || []).filter(n => !n?.read).length;

  // Lógica de cierre unificada
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Cerrar perfil si hace clic fuera
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      // Cerrar notificaciones si hace clic fuera
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      toggleCollapse();
    } else {
      toggle();
    }
  };

  // Días restantes de la suscripción activa
  const subscription = user?.subscriptions?.[0];
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showExpiry = subscription?.status === "ACTIVE" && daysRemaining !== null;

  return (
    <div className="relative h-full px-4 md:px-8 flex items-center justify-between transition-colors duration-300 bg-gradient-to-r from-[#2d0754] via-[#3a0a6a] to-[#480d82] text-white border-b border-purple-900/40 dark:from-[#1d0537] dark:via-[#2c0852] dark:to-[#3b0b6f] dark:text-white dark:border-purple-500/20 shadow-sm">

      {/* Izquierda: Toggle Menu + Workspace Switcher */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="hover:bg-white/10 text-white border-0 p-2 dark:hover:bg-white/10 dark:text-white"
          onClick={handleToggle}
        >
          <Menu size={22} className="text-white dark:text-white" />
        </Button>

        {!isPatient && <WorkspaceSwitcher />}
      </div>

      {/* Derecha: Notificaciones y Perfil */}
      <div className="flex items-center gap-3 md:gap-6">

        <ThemeToggle />

        {/* Badge de vencimiento de suscripción */}
        {showExpiry && daysRemaining !== null && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide border transition-colors ${
              daysRemaining <= 1
                ? "bg-red-500/90 text-white border-red-400/50 animate-pulse"
                : daysRemaining <= 5
                  ? "bg-amber-400/90 text-black border-amber-300/50"
                  : "bg-white/15 text-white/80 border-white/20"
            }`}
            title={`Tu suscripción vence en ${daysRemaining} ${daysRemaining === 1 ? "día" : "días"}`}
          >
            <Clock size={11} className="shrink-0" />
            {daysRemaining <= 0 ? "Vencida" : `${daysRemaining}d`}
          </span>
        )}

        {/* Dropdown de Notificaciones */}
        <div className="relative" ref={notifRef} data-tour="header-notifications">
          <Button
            variant="ghost"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false); // Cerrar el otro por si acaso
            }}
            className={`relative text-white/80 hover:bg-white/10 border-0 transition-all dark:text-purple-200 dark:hover:bg-white/10 ${isNotifOpen ? 'bg-white/20 text-emerald-300 dark:bg-white/10 dark:text-emerald-400' : ''}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border-2 border-[#2d0754] dark:border-[#1d0537] animate-in zoom-in">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </Button>

          {/* Menú de Notificaciones */}
          {isNotifOpen && (
            <div className="fixed top-16 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 w-auto sm:w-80 md:w-[400px] bg-base-100 text-base-content rounded-2xl shadow-2xl border border-base-300 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh]">
              <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
                <Text as="h3" className="font-bold text-base-content">Notificaciones</Text>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 hover:underline transition-all bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40"
                      title="Marcar todas las notificaciones como leídas"
                    >
                      <CheckCheck size={14} />
                      Marcar todo leído
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-lg">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
              </div>

              {/* Contenedor con Scroll para la lista */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <UserNotificationsSection />
              </div>

            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-white/20 dark:bg-purple-500/20 hidden md:block"></div>

        {/* Dropdown de Usuario */}
        <div className="relative" ref={profileRef} data-tour="header-profile">
          <Button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false); // Cerrar el otro por si acaso
            }}
            variant="ghost"
            className="hover:bg-white/10 text-white dark:hover:bg-white/10 dark:text-white border-0 px-2 gap-3"
          >
            <div className="text-right hidden md:block">
              <Text as={'p'} className="text-sm font-bold text-white dark:text-white leading-none">@{user?.username}</Text>
              <Text as={'p'} className="text-[10px] font-extrabold text-emerald-400 dark:text-[#10b981] uppercase tracking-wider mt-1">
                {user?.permits?.name === 'PATIENT'
                  ? 'Paciente'
                  : activeWorkspace?.type === 'ORGANIZATION'
                    ? activeWorkspace.role === 'CLINIC_ADMIN' ? 'Admin' : 'Nutricionista'
                    : user?.subscriptions?.[0]?.plan?.name || 'Free'}
              </Text>
            </div>
            <Avatar
              size="sm"
              shape="circle"
              src={user?.avatarUrl}
              initials={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
            />
            <ChevronDown size={14} className={`text-white/80 dark:text-purple-300 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Menú de Perfil */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-base-100 text-base-content rounded-2xl shadow-2xl border border-base-300 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-base-300 mb-1">
                <p className="text-xs text-base-content/50">Conectado como</p>
                <p className="text-sm font-bold text-base-content truncate">{user?.email}</p>
              </div>

              <InternalLink
                href={'/dashboard/profile'}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-base-content/70 hover:bg-base-200 hover:text-primary transition-colors"
                onClick={() => setIsProfileOpen(false)}
              >
                <User size={16} /> {t('common.auth.profile')}
              </InternalLink>

              <div className="h-px bg-base-300 my-1 mx-2"></div>

              <div className="px-2">
                <Button
                  onClick={() => {
                    authStorage.clearTokens();
                    logout();
                    window.location.href = "/";
                  }}
                  variant="error"
                  className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-semibold transition-all rounded-xl"
                >
                  <LogOut size={16} /> {t('common.auth.logout')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};