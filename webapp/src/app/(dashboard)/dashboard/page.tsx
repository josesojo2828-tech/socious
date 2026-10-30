"use client";

import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { resolveDashboardView } from "@/shared/authz/dashboard-view";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useTranslation } from "@/context/i18n.context";
import DashboardUserPage from "@/features/user/components/pages/DashboardUserPage";
import AdminAnalyticsPage from "./analytics/page";
import { ClinicDashboardPage } from "@/features/organization/pages/ClinicDashboardPage";

export default function AppDashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();

    const isClinicWorkspace = activeWorkspace?.type === "ORGANIZATION";
    const view = resolveDashboardView(user, isClinicWorkspace);

    return (
        <div className="space-y-6 pb-10 font-sans">
            <div className="flex flex-col items-start gap-4">
                <main className="w-full">
                    {view === "admin" ? (
                        <AdminAnalyticsPage />
                    ) : view === "clinic" ? (
                        <ClinicDashboardPage />
                    ) : (
                        <DashboardUserPage />
                    )}
                </main>
            </div>
        </div>
    );
}