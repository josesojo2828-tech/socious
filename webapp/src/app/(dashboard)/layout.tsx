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
    const { hasLoaded, isLoading, fetchWorkspaces, workspaces } = useWorkspaceStore();
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

    const hasOrganization = useMemo(
        () => workspaces.some((w) => w.type === 'ORGANIZATION'),
        [workspaces],
    );

    const { t } = useTranslation();
    const userName = user?.email || "Usuario";

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
        if (isPatient && pathname?.startsWith('/dashboard/subscription')) {
            router.replace('/dashboard');
            return;
        }
        // Business-first: an account without an organization must finish
        // onboarding before anything else — this is what turns orphaned
        // registrations into working ERP tenants. Platform admins manage the
        // whole fleet and never need one.
        if (hasLoaded && !isSuperAdminOrAdmin && !hasOrganization) {
            router.replace('/onboarding/business');
            return;
        }
        if (isAuthorized && !hasActiveSubscription && pathname !== '/dashboard/subscription') {
            router.replace('/dashboard/subscription');
        }
    }, [hasLoaded, hasOrganization, isAuthorized, hasActiveSubscription, isPatient, isSuperAdminOrAdmin, pathname, router]);

    // The api client only attaches X-Workspace-Id once the store resolved the
    // organization; without it every mutating dashboard call answers 403
    // ("Crea una organización para configurar el negocio"). Gate the whole
    // shell on that list so no screen ever fires a half-contexted request.
    useEffect(() => {
        if (!hasLoaded && !isLoading) {
            void fetchWorkspaces(user);
        }
    }, [fetchWorkspaces, hasLoaded, isLoading, user]);

    if (!isAuthorized || !hasLoaded) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-base-100">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-base-content/60 mt-4 animate-pulse">
                    {isAuthorized ? "Cargando tu espacio de trabajo…" : t('common.auth.verifying_session')}
                </p>
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
                        <header className="h-16 border-b border-[#1a2a46]/10 bg-[#f0ede4] z-30 sticky top-0 flex-shrink-0 print:hidden dark:bg-[#111527] dark:border-white/10">
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

                </div>
            </FeedbackDrawer>
        </ComponentStackBoundary>
    );
}