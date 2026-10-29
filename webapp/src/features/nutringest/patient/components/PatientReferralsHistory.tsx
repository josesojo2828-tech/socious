'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { PatientReferralService } from '@/features/nutringest/patient-referral/services/patient-referral.service';
import { ReferralStatusBadge } from '@/features/nutringest/patient-referral/components/ReferralStatusBadge';
import { useTranslation } from '@/context/i18n.context';
import type { PatientReferral } from '@/types/nutringest/patient-referral.interface';

interface Props {
    patientId: string;
    // Contador externo: al incrementar, re-ejecuta la carga (coordinación con el tab Equipo).
    refreshToken?: number;
}

const getErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.message || err?.message || fallback;

const nutritionistName = (r: PatientReferral, side: 'from' | 'to') => {
    const nutritionist = side === 'from' ? r.fromNutritionist : r.toNutritionist;
    const user = nutritionist?.user;
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'Nutricionista';
};

export const PatientReferralsHistory = ({ patientId, refreshToken }: Props) => {
    const { t } = useTranslation();
    const [referrals, setReferrals] = useState<PatientReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await PatientReferralService.getHistoryByPatient(patientId);
            setReferrals(res.data ?? []);
        } catch (err: any) {
            console.error('Error cargando historial de referidos:', err);
            setError(getErrorMessage(err, 'No se pudo cargar el historial de referidos.'));
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshToken]);

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pb-4">
                <div>
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                        <History className="text-emerald-600" size={20} />
                        Historial de referidos
                    </h3>
                    <p className="text-xs text-base-content/60 mt-0.5">
                        Todos los referidos asociados a este paciente.
                    </p>
                </div>
                <button
                    onClick={fetchHistory}
                    disabled={loading}
                    className="btn btn-outline btn-sm rounded-xl flex items-center gap-2 text-base-content/70 border-base-300 hover:bg-base-200 shrink-0"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refrescar
                </button>
            </div>

            {loading ? (
                <div className="min-h-[30vh] w-full flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-base-content/60 font-medium animate-pulse">Cargando historial...</p>
                </div>
            ) : error ? (
                <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl max-w-2xl mx-auto my-4 shadow-sm text-center">
                    <div className="flex justify-center mb-3 text-red-500">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-red-800 mb-2">Error al cargar el historial</h3>
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                    <button
                        onClick={fetchHistory}
                        className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={16} />
                        Intentar de nuevo
                    </button>
                </div>
            ) : referrals.length === 0 ? (
                <div className="min-h-[30vh] w-full flex flex-col items-center justify-center border-t border-base-200 border-dashed">
                    <History className="h-12 w-12 text-base-content/40 mb-3" />
                    <h3 className="text-lg font-bold text-base-content/60 mb-1">Sin referidos</h3>
                    <p className="text-base-content/50 text-sm">Este paciente todavía no tiene referidos.</p>
                </div>
            ) : (
                <div className="overflow-x-auto nav-scrollbar border-t border-base-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-base-200 text-base-content/60 font-semibold border-b border-base-200 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Remitente</th>
                                <th className="px-6 py-3">Destinatario</th>
                                <th className="px-6 py-3">Mensaje</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">{t('dashboard.patients.detail.team.typeLabel')}</th>
                                <th className="px-6 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {referrals.map((r) => (
                                <tr key={r.id} className="hover:bg-purple-50/10 transition-colors">
                                    <td className="px-6 py-4 text-base-content/70">{nutritionistName(r, 'from')}</td>
                                    <td className="px-6 py-4 text-base-content/70">{nutritionistName(r, 'to')}</td>
                                    <td className="px-6 py-4">
                                        {r.message ? (
                                            <span
                                                className="text-base-content/60 italic text-xs border-l-2 border-purple-200 pl-2 block max-w-[280px] truncate"
                                                title={r.message}
                                            >
                                                "{r.message}"
                                            </span>
                                        ) : (
                                            <span className="text-base-content/50 text-xs">Sin mensaje</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-base-content/60 text-xs whitespace-nowrap">
                                        {new Date(r.createdAt).toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        {r.type ? (
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    r.type === 'COLLABORATOR'
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                                }`}
                                            >
                                                {r.type === 'COLLABORATOR'
                                                    ? t('dashboard.patients.detail.team.type.collaborator')
                                                    : t('dashboard.patients.detail.team.type.transfer')}
                                            </span>
                                        ) : (
                                            <span className="text-base-content/40 text-xs">&mdash;</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <ReferralStatusBadge status={r.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
