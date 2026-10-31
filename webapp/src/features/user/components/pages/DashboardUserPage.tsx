import {
    Calendar,
    Mail,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useTranslation } from '@/context/i18n.context';
import { usePaymentAnalytics } from '../../hooks/analitics/usePaymentAnalytics';
import { Avatar } from '@/shared/components/atoms/Avatar';
import { ExtractValue } from '@/shared/components/organisms/DynamicTable/StractValue';
import { useReferrals } from '../../hooks/useReference';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useLocationUser } from '../../hooks/useLocationUser';
import { ConfirmLocationModal } from '../map/ConfirmLocationModal';
import { useModalStore } from '@/shared/store/ui/useModalStore';

import Link from 'next/link';
import { PremiumHubShowcase } from '../dashboard/PremiumHubShowcase';
import { AgendaHistoryChart } from '../dashboard/AgendaHistoryChart';

const NutriMapPicker = dynamic(() => import('../map/NutriMapPicker'), { ssr: false });

export default function DashboardUserPage() {
    const { copyReferralLink } = useReferrals({ execute: false });
    const { user, refreshSession } = useAuthStore();
    const { history } = usePaymentAnalytics();
    const { saveLocation, location, setLocation } = useLocationUser(user);

    useEffect(() => {
        refreshSession();
    }, []);

    const { openModal } = useModalStore();
    const { t } = useTranslation();

    const sub = user?.subscriptions ? user?.subscriptions[0] : null;
    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

    const handleLocationChange = (lat: number, lng: number) => {
        setLocation({ lat, lng });
        openModal(<ConfirmLocationModal lat={lat} lng={lng} onSave={saveLocation} />);
    };

    return (
        <div className="w-full md:p-8 space-y-8 animate-fade-in font-sans text-base-content">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-base-200">
                <div className="flex items-center gap-6">
                    <div className="avatar indicator">
                        <span className="indicator-item badge badge-success w-4 h-4 p-0 border-2 border-base-100 right-2 bottom-2"></span>
                        <div className="w-20 md:w-24 rounded-full ring ring-base-200 ring-offset-base-100 ring-offset-2">
                            <Avatar
                                size="lg"
                                shape="circle"
                                src={user?.avatarUrl}
                                initials={`${user?.firstName}${user?.lastName}`}
                                prefix
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-black text-base-content tracking-tight flex items-center gap-2">
                                {user?.firstName} {user?.lastName}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-base-200 text-base-content/70 border border-base-300">
                                @{user?.username}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-base-content/70 font-medium">
                            <span className="flex items-center gap-1.5"><Mail size={15} className="text-primary" /> {user?.email}</span>
                            <span className="flex items-center gap-1.5">
                                <Calendar size={15} className="text-primary" /> 
                                {t('dashboard.user_dashboard.member_since') || 'Miembro desde'}{' '}
                                <span className="font-semibold text-base-content">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                </span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-[#059669] border border-emerald-500/20 uppercase tracking-wider">{sub?.plan?.name || 'Free'}</span>
                        </div>
                    </div>
                </div>

                {/* Wallet & Plan button removed: lives on sub.nutringest.com */}
            </div>

            {/* Hub Visual de Módulos Destacados (Exclusivo usuarios PREMIUM) */}
            <PremiumHubShowcase />

            {/* KPIs del negocio (tab General) y Ubicación del Consultorio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='grid grid-cols-2 gap-3'>
                    <div className="card bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 col-span-2 flex-row items-center justify-between text-base-content">
                        <div>
                            <h2 className="font-bold text-xl text-base-content">Invita y Gana</h2>
                            <p className="text-base-content/70">Comparte tu enlace único</p>
                        </div>
                        <div className="join">
                            <input className="input input-bordered join-item" value={referralLink} readOnly />
                            <button
                                className="btn btn-primary join-item"
                                onClick={() => copyReferralLink(referralLink)}
                            >
                                Copiar
                            </button>
                        </div>
                    </div>

                </div>


                <div className="p-8 bg-base-100 border border-base-300 shadow-sm rounded-2xl flex flex-col gap-6 text-base-content">
                    <div>
                        <h2 className="text-2xl font-bold mb-4 text-base-content">Ubicación de tu Consultorio</h2>

                        <NutriMapPicker
                            onLocationSelect={handleLocationChange}
                            lat={location?.lat}  // Opcional: Para cargar una posición guardada
                            lng={location?.lng} // Opcional
                            height="400px"
                        />

                        {location && location.lat && location.lng ? (
                            <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-xl text-primary text-xs font-mono flex items-center justify-between">
                                <span>Latitud: {location.lat.toFixed(5)}</span>
                                <span>Longitud: {location.lng.toFixed(5)}</span>
                            </div>
                        ) : null}
                    </div>
                </div>


            </div>

            {/* Gráfico de Histórico de Agenda con selector Mes/Año */}
            <AgendaHistoryChart />

            <div className="col-span-3 overflow-x-auto shadow-sm bg-base-100 border border-base-300 rounded-box">
                <table className="table">
                    <thead>
                        <tr>
                            <th>{t('dashboard.wallet.table.date')}</th>
                            <th>{t('dashboard.wallet.table.method')}</th>
                            <th>{t('dashboard.wallet.table.amount')}</th>
                            <th>{t('dashboard.wallet.table.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.loading ? (
                            <tr><td colSpan={4} className="text-center">{t('dashboard.wallet.loading')}</td></tr>
                        ) : (
                            history && history.data && history.data.map((tx: any) => (
                                <tr key={tx.id}>
                                    <td>
                                        <ExtractValue object={tx} value="createdAt" formatter="date" />
                                    </td>
                                    <td>{tx.paymentMethod?.paymentMethod?.name || 'N/A'}</td>
                                    <td className={tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
                                        <ExtractValue object={tx} value="amount" formatter="currency" />
                                    </td>
                                    <td>
                                        <ExtractValue object={tx} value="status" formatter="status_badge" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
