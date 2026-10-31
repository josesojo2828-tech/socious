// src/app/(dashboard)/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { authStorage } from "@/shared/lib/auth.storage";
import { Sidebar } from "@/shared/components/organisms/ui/Sidebar"; // Ajusta la ruta según tu estructura
import { PrivateHeader } from "@/shared/components/organisms/ui/PrivateHeader"; // Ajusta la ruta
import { Loader2 } from "lucide-react"; // O tu componente Spinner
import { useDashbaordStore } from "@/features/dashboard/hooks/useDashboardUI";
import { useTranslation } from "@/context/i18n.context";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { FeedbackDrawer } from "@/shared/components/organisms/ui/Sidebar/FeedbackDrawer";
import { PageGuide } from "@/components/ui/page-guide";
import { type TourStep } from "@/components/ui/guided-tour";
import { resolveTour } from "@/components/ui/tour-routes";
import { WALLET_TOUR_STEPS } from "@/features/user/components/wallet/walletTourSteps";
import { PROFILE_TOUR_STEPS } from "@/features/user/components/profile/profileTourSteps";
import { cn, slugify } from "@/shared/lib/utils";
import { ComponentStackBoundary } from "@/shared/components/providers/ComponentStackBoundary";

const isTokenExpired = (token: string): boolean => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (!payload.exp) return true;
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, sidebar, refreshSession, logout } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();
    const [isAuthorized, setIsAuthorized] = useState(false);

    const isSuperAdminOrAdmin =
        user?.permitId === 'SUPERADMIN' ||
        user?.permitId === 'ADMIN' ||
        user?.permitId === 'SUPER_ADMIN' ||
        user?.permits?.name === 'SUPERADMIN' ||
        user?.permits?.name === 'ADMIN';

    const isPatient = user?.permits?.name === 'PATIENT';

    const hasActiveSubscription = useMemo(() => {
        if (isSuperAdminOrAdmin || isPatient) return true;
        return Boolean(
            user?.subscriptions?.some(
                (s) => s.status === 'ACTIVE' && (!s.endDate || new Date(s.endDate) > new Date())
            )
        );
    }, [isSuperAdminOrAdmin, isPatient, user?.subscriptions]);

    const { t } = useTranslation();
    const userName = user?.email || "Usuario";

    // Explicit allowlist: only the exact routes below own a tour. Every other
    // `/dashboard/**` route (subroutes, CRUD, adoption, patients, …) gets `null`
    // so the dashboard walkthrough never leaks into them. The dashboard tour is
    // additionally role-gated to nutritionists (see `resolveTour`).
    const tour = useMemo(
        () => resolveTour(pathname, user, activeWorkspace?.type === 'ORGANIZATION'),
        [pathname, user, activeWorkspace?.type],
    );

    const tourSteps = useMemo<TourStep[] | null>(() => {
        if (!tour) return null;
        if (tour.kind === "profile") return PROFILE_TOUR_STEPS;
        if (tour.kind === "wallet") return WALLET_TOUR_STEPS;
        const steps: TourStep[] = [
            {
                title: "¡Bienvenido a tu panel!",
                body: "Te muestro en 20 segundos dónde está cada cosa. Puedes cerrar la guía cuando quieras.",
                mood: "wave",
            },
            {
                target: '[data-tour="header-notifications"]',
                title: "Tus notificaciones",
                body: "Aquí te avisamos de turnos, vencimientos y novedades. El puntito verde marca las que todavía no has leído.",
                mood: "thinking",
            },
            {
                target: '[data-tour="header-profile"]',
                title: "Tu perfil",
                body: "Desde acá entrás a tu perfil, cambiás de espacio de trabajo y cerrás sesión.",
                mood: "happy",
            },
            {
                target: '[data-tour="sidebar"]',
                title: "Tu menú de navegación",
                body: "Toda la plataforma se organiza desde acá. Las secciones que ves dependen de tu plan.",
                mood: "presenting",
            },
        ];

        (sidebar || []).forEach((section) => {
            const rawTitle = section?.title || "";
            if (!rawTitle) return;
            steps.push({
                target: `[data-tour="sidebar-section-${slugify(rawTitle)}"]`,
                title: t(rawTitle),
                body: "Los accesos de esta sección.",
                mood: "pointing",
            });
        });

        steps.push(
            {
                target: '[data-tour="hub-campus"]',
                title: "Campus Nutringest",
                body: "Pasantías & formación: 120 días de acceso PRO gratis para estudiantes.",
                mood: "pointing",
            },
            {
                target: '[data-tour="hub-community"]',
                title: "Comunidad Nutringest",
                body: "La red de nutricionistas para conectar y compartir.",
                mood: "pointing",
            },
            {
                target: '[data-tour="hub-foods"]',
                title: "Base de Alimentos",
                body: "La tabla nutricional general de referencia.",
                mood: "pointing",
            },
            {
                target: '[data-tour="hub-exchange"]',
                title: "Alimentos de Intercambio",
                body: "Raciones por grupos y gramajes.",
                mood: "pointing",
            },
            {
                target: '[data-tour="hub-marketplace"]',
                title: "Marketplace",
                body: "Cursos, ebooks, templates y más.",
                mood: "pointing",
            },
            {
                title: "¡Eso es todo!",
                body: "Ya conocés lo esencial de tu panel. Si te perdés, tocá el botón de la guía cuando quieras.",
                mood: "celebrate",
            },
        );

        return steps;
    }, [sidebar, t, tour]);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const token = authStorage.getAccessToken();
            const refreshToken = authStorage.getRefreshToken();

            if (!token || isTokenExpired(token)) {
                if (!refreshToken) {
                    logout(true);
                    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return;
                }

                try {
                    await refreshSession();
                    if (isMounted) setIsAuthorized(true);
                } catch {
                    logout(true);
                    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
            } else {
                if (isMounted) setIsAuthorized(true);
            }
        };

        checkSession();

        return () => {
            isMounted = false;
        };
    }, [refreshSession, logout]);

    useEffect(() => {
        if (isPatient && (pathname?.startsWith('/dashboard/subscription') || pathname?.startsWith('/dashboard/consulta-bolsillo'))) {
            router.replace('/dashboard');
            return;
        }
        if (isAuthorized && !hasActiveSubscription && pathname !== '/dashboard/subscription') {
            router.replace('/dashboard/subscription');
        }
    }, [isAuthorized, hasActiveSubscription, isPatient, pathname, router]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-base-100">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-base-content/60 mt-4 animate-pulse">{t('common.auth.verifying_session')}</p>
            </div>
        );
    }

    return (
        // ComponentStackBoundary must live HERE (inside app/error.tsx's
        // boundary, above the page) — React delivers errors to the NEAREST
        // boundary, so it captures componentStack first, attaches it to the
        // error instance, and rethrows so root app/error.tsx still renders
        // the fallback and remains the single reporting path.
        <ComponentStackBoundary>
            <FeedbackDrawer>
                <div className="flex min-h-screen md:h-screen bg-base-200 text-base-content font-sans">
                    {/* 1. Sidebar (Componente autónomo) */}
                    <Sidebar sidebar={hasActiveSubscription ? undefined : []} />

                    {/* 2. Área de Contenido Principal */}
                    <div className="flex flex-col flex-1 min-w-0 md:overflow-hidden">

                        {/* A. Header Fijo Superior */}
                        <header className="h-16 border-b border-indigo-950/40 bg-gradient-to-r from-[#210740] via-[#290a4f] to-[#1c063b] z-30 sticky top-0 flex-shrink-0 print:hidden">
                            <PrivateHeader />
                        </header>

                        {/* B. Contenido Scrollable */}
                        <main className="flex-1 overflow-y-visible md:overflow-y-auto p-4 md:p-8 scroll-smooth print:p-0 print:overflow-visible print:bg-white print:w-full print:h-auto">
                            {/* Container centrado para limitar el ancho en monitores ultra-wide */}
                            <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500 print:max-w-none print:w-full print:p-0 print:m-0">
                                {children}
                            </div>
                        </main>
                    </div>

                    {!isPatient && tour && tourSteps && (
                        <PageGuide
                            steps={tourSteps}
                            storageKey={tour.storageKey}
                        />
                    )}
                </div>
            </FeedbackDrawer>
        </ComponentStackBoundary>
    );
}