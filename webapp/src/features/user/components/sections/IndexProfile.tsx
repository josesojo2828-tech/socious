import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    MapPin,
    Calendar,
    TrendingUp,
    Activity,
    CreditCard,
    MoreVertical,
    Download,
    Shield,
    CreditCardIcon,
    Globe,
    Share2,
    BadgeCheck,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { Avatar } from '@/shared/components/atoms/Avatar';
import { useTranslation } from "@/context/i18n.context";
import { getMyPortfolio } from '@/features/portfolio/services/portfolio.service';


export const IndexProfile = () => {
    const { user } = useAuthStore();
    const { addToast } = useToastStore();
    const { t } = useTranslation();
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        getMyPortfolio()
            .then((portfolio) => {
                if (portfolio?.verificationStatus === "VERIFIED") {
                    setIsVerified(true);
                }
            })
            .catch(() => {});
    }, []);

    const handleSharePortfolio = async () => {
        const username = user?.username;
        if (!username) {
            addToast({ type: "error", title: "Error", message: "No tienes un nombre de usuario configurado." });
            return;
        }
        const url = `${window.location.origin}/@${username}`;
        try {
            await navigator.clipboard.writeText(url);
            addToast({ type: "success", title: "¡Copiado!", message: "Enlace copiado al portapapeles." });
        } catch {
            addToast({ type: "error", title: "Error", message: "No se pudo copiar el enlace." });
        }
    };
    const sub = user && user?.subscriptions && user?.subscriptions.find((s) => s.status === 'ACTIVE');
    const methodsLength = user?.paymentMethods?.length;

    return (
        <div className="md:p-8 font-sans">

            <div className="max-w-5xl mx-auto space-y-6">

                {/* ENCABEZADO: Tarjeta de Perfil Principal */}
                <div className="card lg:card-side bg-base-100 shadow-xl overflow-hidden">
                    <figure className="lg:w-1/4 relative">
                        <Avatar shape='square' size='xl' src={user?.avatarUrl} prefix />
                    </figure>
                    <div className="card-body">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="card-title text-3xl font-bold text-base-content flex items-center gap-2">
                                    {user?.firstName} {user?.lastName}
                                    {isVerified && (
                                        <span
                                            title="Nutricionista Verificado por Nutringest 🛡️"
                                            className="inline-flex items-center text-secondary drop-shadow-[0_2px_8px_rgba(14,165,233,0.35)]"
                                        >
                                            <BadgeCheck className="w-7 h-7 fill-secondary text-white" />
                                        </span>
                                    )}
                                </h2>
                                <p className="text-base-content/70 font-medium flex items-center gap-2 mt-1">
                                    <Shield size={16} className="text-primary" /> {user?.permits.name}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 mt-4 text-sm text-base-content/70 font-medium">
                            <div className="flex items-center gap-2">
                                <Mail size={16} className="text-success" /> {user?.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-success" /> 
                                {t('dashboard.user_dashboard.member_since') || 'Miembro desde'}{' '}
                                <span className="font-semibold text-base-content">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial stats removed: wallet, subscription and payment
                    methods live on sub.nutringest.com now */}

                {/* PORTAFOLIO DIGITAL */}
                <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl p-6 border border-success/30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-success/10 text-success">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base-content">Portafolio Digital</h3>
                                <p className="text-sm text-base-content/70">Creá y personalizá tu página pública de nutricionista</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSharePortfolio}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-success/40 text-success hover:bg-success/10 transition-all text-sm font-semibold cursor-pointer"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                            <a
                                href="/dashboard/portfolio"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-success hover:bg-success/80 text-success-content text-sm font-semibold transition-all shadow-sm"
                            >
                                <Globe className="w-4 h-4" />
                                Editar
                            </a>
                        </div>
                    </div>
                </div>

                {/* GRID INFERIOR: Gráficos y Tabla */}
                <div className="grid grid-cols-1 gap-6">

                </div>
            </div>
        </div>
    );
}