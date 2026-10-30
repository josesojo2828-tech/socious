"use client";

import { ProfileSidebar } from "@/features/user/components/ProfileSidebar";
import { useState } from "react";
import { SECTION_TYPE } from "@/features/user/types/user.types";
import { UserSecuritySection } from "@/features/user";
import { UserPreferenceSection } from "@/features/user/components/sections/UserPreferenceSection";
import { UserNotificationsSection } from "@/features/user/components/sections/UserNotificationSection";
import { UserDataSection } from "@/features/user/components/sections/UserDataSection";
import { IndexProfile } from "@/features/user/components/sections/IndexProfile";
import { useTranslation } from "@/context/i18n.context";

export function ProfilePage() {
    const { t } = useTranslation();

    const [section, setSection] = useState<SECTION_TYPE>("data");

    const ChangeSection = (sec: SECTION_TYPE) => setSection(sec);

    return (
        <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Sidebar Izquierdo */}
                <div className="md:col-span-4 lg:col-span-3">
                    <ProfileSidebar section={section} set={ChangeSection} />
                </div>

                {/* Contenido Principal */}
                <div className="md:col-span-8 lg:col-span-9 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-base-300/70 pb-4 gap-4">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-base-content">
                                {section === "dashboard"
                                    ? t("dashboard.user_dashboard.panel_title")
                                    : section === "data"
                                    ? "Datos & Acreditación"
                                    : section === "security"
                                    ? t("dashboard.user_dashboard.security_title")
                                    : section === "notifications"
                                    ? t("dashboard.user_dashboard.notifications_title")
                                    : section === "preferences"
                                    ? t("dashboard.user_dashboard.preferences_title")
                                    : ""}
                            </h1>
                            <p className="text-xs text-base-content/50 mt-0.5">
                                Configuración de cuenta, facturación y presencia digital en Nutringest
                            </p>
                        </div>
                    </div>

                    <div key={section} suppressHydrationWarning>
                        {section === "dashboard" && <IndexProfile key="dashboard" />}
                        {section === "data" && <UserDataSection key="data" />}
                        {/* Wallet, Subscription and Payment Methods sections removed:
                            they live on sub.nutringest.com now */}
                        {section === "notifications" && <UserNotificationsSection key="notifications" />}
                        {section === "preferences" && <UserPreferenceSection key="preferences" />}
                        {section === "security" && <UserSecuritySection key="security" />}
                    </div>
                </div>
            </div>
        </main>
    );
}
