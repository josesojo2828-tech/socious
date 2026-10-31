"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { hasPermit, isAdmin } from "@/shared/authz";

/**
 * `/dashboard` is a router, not a screen: it sends each role to its real
 * working surface. The nutrition-era dashboards (clinic, patient, personal
 * wallet) were deleted with the Socius migration — see odd/tasks/.
 */
export default function AppDashboardPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();

    useEffect(() => {
        const isClinicWorkspace = activeWorkspace?.type === "ORGANIZATION";
        if (isClinicWorkspace) {
            router.replace("/dashboard/ventas");
            return;
        }
        if (isAdmin(user) || hasPermit(user, "USER_LIST")) {
            router.replace("/dashboard/users");
            return;
        }
        router.replace("/");
    }, [activeWorkspace?.type, router, user]);

    return (
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-slate-500 mt-4 animate-pulse">Abriendo tu panel…</p>
        </div>
    );
}
