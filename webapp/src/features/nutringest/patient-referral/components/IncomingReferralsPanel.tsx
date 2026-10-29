'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, RefreshCw, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { PatientReferralService } from '../services/patient-referral.service';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useTranslation } from '@/context/i18n.context';
import { RespondReferralModal } from './RespondReferralModal';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import type { PatientReferral, PatientReferralStatus } from '@/types/nutringest/patient-referral.interface';

const getErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.message || err?.message || fallback;

interface IncomingReferralsPanelProps {
    status?: PatientReferralStatus;
}

export const IncomingReferralsPanel = ({ status = 'PENDING' }: IncomingReferralsPanelProps) => {
    const { openModal } = useModalStore();
    const { t } = useTranslation();
    const [referrals, setReferrals] = useState<PatientReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReferrals = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await PatientReferralService.getIncoming(status);
            setReferrals(res.data);
        } catch (err: any) {
            console.error('Error cargando referidos entrantes:', err);
            setError(getErrorMessage(err, 'No se pudieron cargar los referidos entrantes.'));
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchReferrals();
    }, [fetchReferrals]);

    const handleRespond = (referral: PatientReferral, action: 'accept' | 'reject') => {
        openModal(
            <RespondReferralModal referral={referral} action={action} onDone={fetchReferrals} />,
            { size: 'md' },
        );
    };

    const senderName = (r: PatientReferral) => {
        const u = r.fromNutritionist?.user;
        return u ? `${u.firstName} ${u.lastName}`.trim() : 'Nutricionista desconocido';
    };

    const patientName = (r: PatientReferral) =>
        r.patient ? `${r.patient.firstName} ${r.patient.lastName}`.trim() : 'Paciente';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Solicitudes entrantes</h2>
                <button
                    onClick={fetchReferrals}
                    disabled={loading}
                    className="btn btn-outline btn-sm rounded-xl flex items-center gap-2 text-slate-600 border-slate-300 hover:bg-slate-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refrescar
                </button>
            </div>

            {loading ? (
                <div className="min-h-[30vh] w-full flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-slate-500 font-medium animate-pulse">Cargando referidos...</p>
                </div>
            ) : error ? (
                <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl max-w-2xl mx-auto my-4 shadow-sm text-center">
                    <div className="flex justify-center mb-3 text-red-500">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-red-800 mb-2">Error al cargar referidos</h3>
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                    <button
                        onClick={fetchReferrals}
                        className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={16} />
                        Intentar de nuevo
                    </button>
                </div>
            ) : referrals.length === 0 ? (
                <div className="min-h-[30vh] w-full flex flex-col items-center justify-center bg-white border border-gray-200 border-dashed rounded-xl">
                    <Inbox className="h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-500 mb-1">Sin referidos</h3>
                    <p className="text-slate-400 text-sm">No tienes solicitudes entrantes pendientes.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto nav-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Paciente</th>
                                    <th className="px-6 py-3">Remitente</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Mensaje</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right w-40">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {referrals.map((r) => (
                                    <tr key={r.id} className="hover:bg-purple-50/10 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{patientName(r)}</td>
                                        <td className="px-6 py-4 text-gray-600">{senderName(r)}</td>
                                        <td className="px-6 py-4">
                                            {r.type ? (
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        r.type === 'COLLABORATOR'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : 'bg-sky-50 text-sky-700 border-sky-200'
                                                    }`}
                                                >
                                                    {r.type === 'COLLABORATOR' ? 'Colaborador' : 'Transferencia'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">&mdash;</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.message ? (
                                                <span className="text-gray-500 italic text-xs border-l-2 border-purple-200 pl-2 block max-w-[280px] truncate" title={r.message}>
                                                    "{r.message}"
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Sin mensaje</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                                            {new Date(r.createdAt).toLocaleDateString('es-AR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <ReferralStatusBadge status={r.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleRespond(r, 'accept')}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
                                                    title="Aceptar referido"
                                                >
                                                    <Check size={13} /> Aceptar
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(r, 'reject')}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors"
                                                    title="Rechazar referido"
                                                >
                                                    <X size={13} /> Rechazar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};