"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { getMyPortfolio, updatePortfolio } from "@/features/portfolio/services/portfolio.service";
import type { PortfolioSocialLinks } from "@/types/backend/portfolio.interface";
import { Button } from "@/shared/components/atoms/Button";
import { Loader2, Save, Share2, Instagram, Linkedin, Facebook, Lock, Crown, MessageCircle } from "lucide-react";
import Link from "next/link";

// Custom SVG Icons for TikTok and X (Twitter)
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.63a6.34 6.34 0 0 0-5.11 6.18A6.34 6.34 0 1 0 15.8 17.5V10.1a8.3 8.3 0 0 0 4.79 1.51V8.16a4.84 4.84 0 0 1-1-.47z" />
    </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export function UserSocialSection() {
    const { addToast } = useToastStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [socialLinks, setSocialLinks] = useState<PortfolioSocialLinks>({
        facebook: "",
        instagram: "",
        tiktok: "",
        x: "",
        linkedin: "",
        whatsapp: "",
    });

    useEffect(() => {
        async function fetchPortfolioData() {
            try {
                setLoading(true);
                const portfolio = await getMyPortfolio();
                if (portfolio?.socialLinks) {
                    const rawWs = portfolio.socialLinks.whatsapp || portfolio.socialLinks.phone || "";
                    let displayWs = rawWs;
                    if (displayWs.includes("wa.me/58")) {
                        displayWs = displayWs.split("wa.me/58")[1] || displayWs;
                    } else if (displayWs.includes("wa.me/")) {
                        displayWs = displayWs.split("wa.me/")[1] || displayWs;
                    }

                    setSocialLinks({
                        facebook: portfolio.socialLinks.facebook || "",
                        instagram: portfolio.socialLinks.instagram || "",
                        tiktok: portfolio.socialLinks.tiktok || "",
                        x: portfolio.socialLinks.x || portfolio.socialLinks.twitter || "",
                        linkedin: portfolio.socialLinks.linkedin || "",
                        whatsapp: displayWs,
                    });
                }
            } catch (error: any) {
                if (error.response?.status === 403) {
                    setIsLocked(true);
                } else {
                    console.error("Error al obtener portafolio:", error);
                }
            } finally {
                setLoading(false);
            }
        }
        fetchPortfolioData();
    }, []);

    const handleChange = (network: keyof PortfolioSocialLinks, value: string) => {
        setSocialLinks((prev) => ({
            ...prev,
            [network]: value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            let formattedWs = socialLinks.whatsapp ? socialLinks.whatsapp.trim() : "";
            if (formattedWs && !formattedWs.startsWith("http://") && !formattedWs.startsWith("https://")) {
                let digits = formattedWs.replace(/\D/g, "");
                if (digits.startsWith("04")) {
                    digits = "58" + digits.slice(1);
                } else if (digits.startsWith("4")) {
                    digits = "58" + digits;
                } else if (!digits.startsWith("58")) {
                    digits = "58" + digits;
                }
                formattedWs = `https://wa.me/${digits}`;
            }

            const updatedSocials = {
                ...socialLinks,
                whatsapp: formattedWs,
                twitter: socialLinks.x, // Mantener compatibilidad con twitter
                phone: formattedWs, // Mantener compatibilidad con phone
            };

            await updatePortfolio({
                socialLinks: updatedSocials,
            });

            addToast({
                type: "success",
                title: "¡Guardado!",
                message: "Tus redes sociales y WhatsApp se actualizaron correctamente.",
            });
        } catch (error: any) {
            console.error("Error al actualizar redes sociales:", error);
            addToast({
                type: "error",
                title: "Error",
                message: error.response?.data?.message || "No se pudieron guardar las redes sociales.",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-panel p-8 flex justify-center items-center min-h-[300px]">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    if (isLocked) {
        return null;
    }

    const networks = [
        {
            key: "whatsapp" as const,
            label: "WhatsApp / Teléfono (Contacto Directo)",
            placeholder: "412 1234567 o 0412 1234567",
            icon: <MessageCircle className="text-emerald-500 w-5 h-5" />,
        },
        {
            key: "instagram" as const,
            label: "Instagram",
            placeholder: "https://instagram.com/tu_usuario",
            icon: <Instagram className="text-pink-500 w-5 h-5" />,
        },
        {
            key: "facebook" as const,
            label: "Facebook",
            placeholder: "https://facebook.com/tu_pagina",
            icon: <Facebook className="text-blue-600 w-5 h-5" />,
        },
        {
            key: "tiktok" as const,
            label: "TikTok",
            placeholder: "https://tiktok.com/@tu_usuario",
            icon: <TikTokIcon size={20} />,
        },
        {
            key: "x" as const,
            label: "X (Twitter)",
            placeholder: "https://x.com/tu_usuario",
            icon: <XIcon size={19} />,
        },
        {
            key: "linkedin" as const,
            label: "LinkedIn",
            placeholder: "https://linkedin.com/in/tu_perfil",
            icon: <Linkedin className="text-sky-600 w-5 h-5" />,
        },
    ];

    return (
        <div className="glass-panel p-6 md:p-8 shadow-xl rounded-2xl border border-white/10 space-y-6">
            <div className="border-b border-base-300/50 pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" /> Redes Sociales
                </h2>
                <p className="text-sm opacity-70 mt-1">
                    Conectá tus redes profesionales y personales para que tus pacientes puedan encontrarte fácilmente en tu portafolio público.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 gap-5">
                    {networks.map((net) => (
                        <div key={net.key} className="space-y-1.5">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                {net.icon}
                                {net.label}
                            </label>
                            <div className="relative flex items-center">
                                {net.key === "whatsapp" && (
                                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-base-200/80 border border-r-0 border-base-300/50 rounded-l-xl text-xs font-semibold text-base-content/80 shrink-0">
                                        <span className="text-base">🇻🇪</span>
                                        <span>+58</span>
                                    </div>
                                )}
                                <input
                                    type={net.key === "whatsapp" ? "text" : "url"}
                                    value={socialLinks[net.key] || ""}
                                    onChange={(e) => handleChange(net.key, e.target.value)}
                                    placeholder={net.placeholder}
                                    className={`w-full px-4 py-2.5 bg-base-200/50 border border-base-300/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm ${
                                        net.key === "whatsapp" ? "rounded-r-xl" : "rounded-xl"
                                    }`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 flex justify-end">
                    <Button
                        type="submit"
                        disabled={saving}
                        variant="primary"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-lg"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin w-4 h-4" /> Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Guardar Redes Sociales
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
