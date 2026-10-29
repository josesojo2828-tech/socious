"use client";

import { useEffect, useState } from "react";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { Bell, Key, User, Camera, Loader2, Share2, FileText, Mail, AtSign, Check, BadgeCheck, Wallet, CreditCard, Sparkles } from "lucide-react";
import { Avatar } from "@/shared/components/atoms/Avatar";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { Badge } from "@/shared/components/atoms/Badge";
import { useTranslation } from "@/context/i18n.context";
import { Button } from "@/shared/components/atoms/Button";
import { FC } from "react";
import { SECTION_TYPE } from "../types/user.types";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { getMyPortfolio, updatePortfolio } from "@/features/portfolio/services/portfolio.service";
import { hasEntitlement, isAdmin, ACCESS_KEYS } from "@/shared/authz";

export const ProfileSidebar: FC<{ section: SECTION_TYPE; set: (type: SECTION_TYPE) => void }> = ({
    section,
    set,
}) => {
    const { user, updateStorageUser } = useAuthStore();
    const { t } = useTranslation();
    const { addToast } = useToastStore();

    const [uploading, setUploading] = useState(false);
    const [bio, setBio] = useState("");
    const [savingBio, setSavingBio] = useState(false);

    const [hasPortfolioAccess, setHasPortfolioAccess] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<string>("UNVERIFIED");

    const canAccessSocial = (hasEntitlement(user, ACCESS_KEYS.PREMIUM) || isAdmin(user)) && hasPortfolioAccess;

    const sub = user?.subscriptions ? user?.subscriptions[0] : null;

    useEffect(() => {
        async function loadBio() {
            try {
                const portfolio = await getMyPortfolio();
                if (portfolio) {
                    setHasPortfolioAccess(true);
                    if (portfolio.verificationStatus) {
                        setVerificationStatus(portfolio.verificationStatus);
                    }
                    if (portfolio.bio) {
                        setBio(portfolio.bio);
                    }
                }
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setHasPortfolioAccess(false);
                } else {
                    console.error("Error al cargar la biografía del portafolio:", err);
                }
            }
        }
        loadBio();
    }, []);

    const handleSaveBio = async () => {
        try {
            setSavingBio(true);
            await updatePortfolio({ bio });
            addToast({
                type: "success",
                title: "Biografía actualizada",
                message: "Tu descripción profesional se guardó correctamente.",
            });
        } catch (error) {
            addToast({
                type: "error",
                title: "Error",
                message: "No se pudo guardar la biografía.",
            });
        } finally {
            setSavingBio(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            addToast({
                type: "error",
                title: "Error de archivo",
                message: "La imagen excede el tamaño máximo permitido de 5MB.",
            });
            return;
        }

        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            addToast({
                type: "error",
                title: "Error de formato",
                message: "Solo se permiten imágenes PNG, JPG, JPEG o WEBP.",
            });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await apiClient.post("/api/core/api/profile", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.data?.success && user) {
                updateStorageUser({
                    ...user,
                    avatarUrl: response.data.avatarUrl,
                });

                addToast({
                    type: "success",
                    title: "¡Éxito!",
                    message: "Foto de perfil actualizada correctamente.",
                });
            }
        } catch (error: any) {
            console.error("Error al subir imagen de perfil:", error);
            const errorMsg =
                error?.response?.data?.message || "Ocurrió un error al subir la foto de perfil.";
            addToast({
                type: "error",
                title: "Error al subir",
                message: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg,
            });
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Tarjeta de Resumen e Información de Sesión del Usuario */}
            <div className="glass-panel p-6 shadow-xs border border-base-300/70 flex flex-col items-center text-center relative overflow-hidden rounded-xl bg-base-100">
                {/* Fondo decorativo superior */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/40 via-primary/30 to-success/40 rounded-t-xl z-0" />

                <div className="relative z-10 mt-8 w-full flex flex-col items-center">
                    <div className="relative inline-block group">
                        <label
                            htmlFor="avatar-upload"
                            className="relative cursor-pointer group rounded-full block focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                        >
                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={uploading}
                            />
                            <Avatar
                                size="lg"
                                shape="circle"
                                src={user?.avatarUrl}
                                initials={`${user?.firstName || ""}${user?.lastName || ""}`}
                                prefix
                            />
                            <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {uploading ? (
                                    <Loader2 className="animate-spin text-white w-6 h-6" />
                                ) : (
                                    <Camera className="text-white w-6 h-6" />
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 mt-4">
                        <h2 className="text-xl font-black text-base-content">
                            {user?.firstName} {user?.lastName}
                        </h2>
                        {verificationStatus === "VERIFIED" && (
                            <span title="Nutricionista Verificado Nutringest 🛡️" className="inline-flex text-success shrink-0">
                                <BadgeCheck className="w-5 h-5 fill-success text-white" />
                            </span>
                        )}
                    </div>

                    {/* Datos de Sesión */}
                    <div className="mt-2 space-y-1 text-sm opacity-80 w-full">
                        <p className="flex items-center justify-center gap-1.5 text-xs text-primary font-bold">
                            <AtSign className="w-3.5 h-3.5" />
                            {user?.username || "sin-usuario"}
                        </p>
                        <p className="flex items-center justify-center gap-1.5 text-xs text-base-content/70 font-medium">
                            <Mail className="w-3.5 h-3.5" />
                            {user?.email}
                        </p>
                    </div>

                    <div className="mt-3">
                        {sub ? (
                            <Badge color="red-500">{sub.plan.name}</Badge>
                        ) : (
                            <Badge color="emerald">{user?.permits?.name || "Nutricionista"}</Badge>
                        )}
                    </div>

                    {/* Biografía / Descripción estilo LinkedIn */}
                    {hasPortfolioAccess && (
                        <div className="mt-6 w-full text-left space-y-2 border-t border-base-300 pt-4" data-tour="profile-biolink">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> Biografía profesional
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Escribí una breve descripción profesional..."
                                rows={3}
                                maxLength={500}
                                className="w-full px-3 py-2 text-xs rounded-lg bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none font-medium"
                            />
                            <div className="flex justify-between items-center text-[10px] text-base-content/50">
                                <span>{bio.length}/500</span>
                                <button
                                    type="button"
                                    onClick={handleSaveBio}
                                    disabled={savingBio}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Guardar bio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Menú de Secciones del Perfil */}
            <div className="bg-base-100 p-3 shadow-xs border border-base-300/70 rounded-xl space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-base-content/50 px-3 py-2">
                  Configuración & Cuenta
                </p>
                <nav className="space-y-1">
                    {canAccessSocial && (
                        <Button
                            onClick={() => set("social")}
                            className="w-full justify-start text-left gap-3 text-xs font-bold rounded-lg"
                            variant={section === "social" ? "primary" : "ghost"}
                            data-tour="profile-social"
                        >
                            <Share2 size={16} /> Redes Sociales
                        </Button>
                    )}
                    <Button
                        onClick={() => set("data")}
                        className="w-full justify-start text-left gap-3 text-xs font-bold rounded-lg"
                        variant={section === "data" ? "primary" : "ghost"}
                    >
                        <User size={16} /> Datos & Acreditación
                    </Button>
                    {/* Wallet, Subscription and Payment Methods buttons removed:
                        they live on sub.nutringest.com now */}
                    <Button
                        onClick={() => set("security")}
                        className="w-full justify-start text-left gap-3 text-xs font-bold rounded-lg"
                        variant={section === "security" ? "primary" : "ghost"}
                        data-tour="profile-security"
                    >
                        <Key size={16} /> Seguridad & Contraseña
                    </Button>
                    <Button
                        onClick={() => set("notifications")}
                        className="w-full justify-start text-left gap-3 text-xs font-bold rounded-lg"
                        variant={section === "notifications" ? "primary" : "ghost"}
                        data-tour="profile-notifications"
                    >
                        <Bell size={16} /> Notificaciones
                    </Button>
                </nav>
            </div>
        </div>
    );
};