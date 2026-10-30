"use client";

import { useState } from "react";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { Bell, Key, User, Camera, Loader2, Mail, AtSign, Wallet, CreditCard, Sparkles } from "lucide-react";
import { Avatar } from "@/shared/components/atoms/Avatar";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { Badge } from "@/shared/components/atoms/Badge";
import { useTranslation } from "@/context/i18n.context";
import { Button } from "@/shared/components/atoms/Button";
import { FC } from "react";
import { SECTION_TYPE } from "../types/user.types";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";

export const ProfileSidebar: FC<{ section: SECTION_TYPE; set: (type: SECTION_TYPE) => void }> = ({
    section,
    set,
}) => {
    const { user, updateStorageUser } = useAuthStore();
    const { t } = useTranslation();
    const { addToast } = useToastStore();

    const [uploading, setUploading] = useState(false);

    const sub = user?.subscriptions ? user?.subscriptions[0] : null;

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
                </div>
            </div>

            {/* Menú de Secciones del Perfil */}
            <div className="bg-base-100 p-3 shadow-xs border border-base-300/70 rounded-xl space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-base-content/50 px-3 py-2">
                  Configuración & Cuenta
                </p>
                <nav className="space-y-1">
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