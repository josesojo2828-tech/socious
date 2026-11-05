"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { hasPermit, isAdmin } from "@/shared/authz";
import { resolveDashboardHome } from "@/features/dashboard/lib/dashboard-home";
import HomeDashboard from "@/features/dashboard/components/HomeDashboard";

/**
 * `/dashboard` is a router, not a screen. It must wait for the workspace
 * list: `activeWorkspace` defaults to PERSONAL until
 * `/api/organizations/my-workspaces` answers, and routing on that default
 * bounced real organization users back to the public landing page.
 */
export default function AppDashboardPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { activeWorkspace, hasLoaded, isLoading, fetchWorkspaces } =
        useWorkspaceStore();

    // Kick the workspace load if nothing else already started it (the header
    // switcher normally does, but a hard refresh on /dashboard races it).
    useEffect(() => {
        if (!hasLoaded && !isLoading) {
            void fetchWorkspaces(user);
        }
    }, [fetchWorkspaces, hasLoaded, isLoading, user]);

    const route = hasLoaded
        ? resolveDashboardHome({
              workspaceType: activeWorkspace?.type,
              isAdmin: isAdmin(user),
              hasUserListPermit: hasPermit(user, "USER_LIST"),
              hasUser: Boolean(user),
          })
        : null;

    useEffect(() => {
        if (!route) return;
        // El espacio de organización se queda en /dashboard: el panel con
        // datos reales ES la vista (feedback: nueva home del dashboard).
        if (route === "platform-dashboard") {
            router.replace("/dashboard/analytics");
        } else if (route === "platform-admin") {
            router.replace("/dashboard/users");
        } else if (route === "login") {
            router.replace("/login");
        }
    }, [route, router]);

    if (route === "org-workspace") {
        return <HomeDashboard />;
    }

    if (route === "choose-workspace") {
        return (
            <div className="min-h-[60vh] w-full flex flex-col items-center justify-center text-center px-4">
                <Briefcase className="h-10 w-10 text-indigo-500 mb-4" />
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Elegí un espacio de trabajo
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                    Tu cuenta todavía no tiene una organización activa en este
                    dispositivo. Usá el selector de la parte superior para
                    entrar a tu negocio.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-slate-500 mt-4 animate-pulse">
                Cargando tu espacio de trabajo…
            </p>
        </div>
    );
}
