"use client";

import { ProfileSidebar } from "@/features/user/components/ProfileSidebar";
import { useState, useEffect } from "react";
import { SECTION_TYPE } from "@/features/user/types/user.types";
import { UserSecuritySection } from "@/features/user";
import { UserPreferenceSection } from "@/features/user/components/sections/UserPreferenceSection";
import { UserNotificationsSection } from "@/features/user/components/sections/UserNotificationSection";
import { UserDataSection } from "@/features/user/components/sections/UserDataSection";
import { UserSocialSection } from "@/features/user/components/sections/UserSocialSection";
import { IndexProfile } from "@/features/user/components/sections/IndexProfile";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ExternalLink, Copy } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { getMyPortfolio } from "@/features/portfolio/services/portfolio.service";
import { hasEntitlement, isAdmin, ACCESS_KEYS } from "@/shared/authz";

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { addToast } = useToastStore();

    const [section, setSection] = useState<SECTION_TYPE>("data");
    const [hasPortfolioAccess, setHasPortfolioAccess] = useState(false);

    const canAccessSocial = (hasEntitlement(user, ACCESS_KEYS.PREMIUM) || isAdmin(user)) && hasPortfolioAccess;

    useEffect(() => {
        if (section === "social" && !canAccessSocial) {
            setSection("data");
        }
    }, [section, canAccessSocial]);

    useEffect(() => {
        async function checkAccess() {
            try {
                const portfolio = await getMyPortfolio();
                if (portfolio) {
                    setHasPortfolioAccess(true);
                }
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setHasPortfolioAccess(false);
                }
            }
        }
        checkAccess();
    }, []);

    const ChangeSection = (sec: SECTION_TYPE) => setSection(sec);

    const publicUrl = typeof window !== "undefined" && user?.username
        ? `${window.location.origin}/nutri/@${user.username}`
        : `/nutri/@${user?.username || ""}`;

    const handleCopyLink = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(publicUrl);
        addToast({
            type: "success",
            title: "¡Enlace copiado!",
            message: "El enlace a tu portafolio público se copió al portapapeles.",
        });
    };

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
                                {section === "social"
                                    ? "Redes Sociales"
                                    : section === "dashboard"
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

                        {/* Botones de Compartir y Ver Portafolio Público */}
                        {user?.username && canAccessSocial && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg border border-base-300/80 hover:bg-base-200"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar Enlace
                                </Button>
                                <a
                                    href={`/nutri/@${user.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button
                                        variant="primary"
                                        className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg shadow-sm"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Ver Portafolio
                                    </Button>
                                </a>
                            </div>
                        )}
                    </div>

                    <div key={section} suppressHydrationWarning>
                        {section === "social" && <UserSocialSection key="social" />}
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
