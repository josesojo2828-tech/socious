import {
    Mail,
    Calendar,
    Shield,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { Avatar } from '@/shared/components/atoms/Avatar';
import { useTranslation } from "@/context/i18n.context";


export const IndexProfile = () => {
    const { user } = useAuthStore();
    const { t } = useTranslation();

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

                {/* GRID INFERIOR: Gráficos y Tabla */}
                <div className="grid grid-cols-1 gap-6">

                </div>
            </div>
        </div>
    );
}