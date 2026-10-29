import {
    MapPin,
    Calendar,
    Mail,
    Users,
    Utensils,
    ListTree,
    BadgeCheck,
} from 'lucide-react';
import { getMyPortfolio } from '@/features/portfolio/services/portfolio.service';
import { StatCard } from '../dashboard/StatCard';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useTranslation } from '@/context/i18n.context';
import { usePaymentAnalytics } from '../../hooks/analitics/usePaymentAnalytics';
import { Avatar } from '@/shared/components/atoms/Avatar';
import { ExtractValue } from '@/shared/components/organisms/DynamicTable/StractValue';
import { useReferrals } from '../../hooks/useReference';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useLocationUser } from '../../hooks/useLocationUser';
import { ConfirmLocationModal } from '../map/ConfirmLocationModal';
import { useModalStore } from '@/shared/store/ui/useModalStore';

import { usePatientMetrics } from '@/features/nutringest/patient/hooks/usePatientMetrics';
import { useMenuDashboard } from '@/features/nutringest/menu/hooks/useMenuDashboard';
import { useConsultationMetrics } from '@/features/nutringest/consultation/hooks/useConsultationMetrics';
import { ExchangeDashboardMetrics } from '@/features/nutringest/exchange-list/types/exchange-list.dashbaord.type';
import { apiClient } from '@/shared/api/api.client';
import Link from 'next/link';
import { PremiumHubShowcase } from '../dashboard/PremiumHubShowcase';
import { AgendaHistoryChart } from '../dashboard/AgendaHistoryChart';

const NutriMapPicker = dynamic(() => import('../map/NutriMapPicker'), { ssr: false });

export default function DashboardUserPage() {
    const { copyReferralLink } = useReferrals({ execute: false });
    const { user, refreshSession } = useAuthStore();
    const { history } = usePaymentAnalytics();
    const { metrics: patientMetrics } = usePatientMetrics();
    const { metrics: consultationMetrics } = useConsultationMetrics();
    const { data: menuMetrics } = useMenuDashboard();
    const { saveLocation, location, setLocation } = useLocationUser(user);

    const [exchangeListMetrics, setExchangeListMetrics] = useState<ExchangeDashboardMetrics | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        refreshSession();
        const controller = new AbortController();
        apiClient
            .get<ExchangeDashboardMetrics>('/api/exchange-list/dashboard', { signal: controller.signal })
            .then((res) => setExchangeListMetrics(res.data))
            .catch((err) => {
                if (err?.code !== 'ERR_CANCELED') {
                    console.error('Error fetching exchange metrics:', err);
                }
            });

        getMyPortfolio()
            .then((portfolio) => {
                if (portfolio?.verificationStatus === "VERIFIED") {
                    setIsVerified(true);
                }
            })
            .catch(() => {});

        return () => controller.abort();
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
                                {isVerified && (
                                    <span
                                        title="Nutricionista Verificado por Nutringest 🛡️"
                                        className="inline-flex items-center text-[#0ea5e9] drop-shadow-[0_2px_8px_rgba(14,165,233,0.35)] transition-transform hover:scale-110 cursor-pointer"
                                    >
                                        <BadgeCheck className="w-7 h-7 fill-[#0ea5e9] text-white" />
                                    </span>
                                )}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-base-200 text-base-content/70 border border-base-300">
                                @{user?.username}
                            </span>
                            {isVerified && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-sm shadow-sky-500/20 flex items-center gap-1">
                                    <BadgeCheck className="w-3.5 h-3.5 fill-white text-sky-500" />
                                    VERIFICADO
                                </span>
                            )}
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
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-[#10b981] border border-emerald-500/20 uppercase tracking-wider">{sub?.plan?.name || 'Free'}</span>
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
                    <StatCard
                        title={t('dashboard.user_dashboard.total_patients') || 'Pacientes Totales'}
                        value={patientMetrics?.overview?.total ?? (user?.nutritionistProfile?._count?.patients || 0)}
                        subtext=""
                        icon={<Users size={20} />}
                        trend="neutral"
                    />
                    <StatCard
                        title={t('dashboard.user_dashboard.total_consultations') || 'Consultas Realizadas'}
                        value={consultationMetrics?.totalConsultations || 0}
                        subtext=""
                        icon={<Calendar size={20} />}
                        trend="neutral"
                    />
                    <StatCard
                        title={t('dashboard.user_dashboard.total_menus') || 'Total Menús'}
                        value={menuMetrics?.overview?.totalMenus ?? 0}
                        subtext=""
                        icon={<Utensils size={20} />}
                        trend="neutral"
                    />
                    <StatCard
                        title={t('dashboard.user_dashboard.total_exchange_lists') || 'Total Listas de Intercambio'}
                        value={exchangeListMetrics?.overview?.totalGroups ?? 0}
                        subtext=""
                        icon={<ListTree size={20} />}
                        trend="neutral"
                    />

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
