'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, RefreshCw, AlertCircle, Loader2, Ban } from 'lucide-react';
import { PatientReferralService } from '../services/patient-referral.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import type { PatientReferral } from '@/types/nutringest/patient-referral.interface';

const getErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.message || err?.message || fallback;

export const OutgoingReferralsList = () => {
    const { addToast } = useToastStore();
    const [referrals, setReferrals] = useState<PatientReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const fetchReferrals = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await PatientReferralService.getOutgoing();
            setReferrals(res.data);
        } catch (err: any) {
            console.error('Error cargando referidos salientes:', err);
            setError(getErrorMessage(err, 'No se pudieron cargar los referidos salientes.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReferrals();
    }, [fetchReferrals]);

    const handleCancel = async (id: string) => {
        if (!window.confirm('¿Querés cancelar este referido?')) return;
        setCancellingId(id);
        try {
            const res = await PatientReferralService.cancel(id);
            addToast({
                type: 'success',
                title: 'Referido cancelado',
                message: res.data?.message || 'El referido fue cancelado correctamente.',
            });
            await fetchReferrals();
        } catch (err: any) {
            console.error('Error cancelando referido:', err);
            addToast({
                type: 'error',
                title: 'Error al cancelar',
                message: getErrorMessage(err, 'No se pudo cancelar el referido.'),
            });
        } finally {
            setCancellingId(null);
        }
    };

    const recipientName = (r: PatientReferral) => {
        const u = r.toNutritionist?.user;
        return u ? `${u.firstName} ${u.lastName}`.trim() : 'Nutricionista';
    };

    const patientName = (r: PatientReferral) =>
        r.patient ? `${r.patient.firstName} ${r.patient.lastName}`.trim() : 'Paciente';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Referidos enviados</h2>
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
                    <Send className="h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-500 mb-1">Sin referidos</h3>
                    <p className="text-slate-400 text-sm">Todavía no enviaste ninguna solicitud.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto nav-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Paciente</th>
                                    <th className="px-6 py-3">Destinatario</th>
                                    <th className="px-6 py-3">Mensaje</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right w-32">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {referrals.map((r) => (
                                    <tr key={r.id} className="hover:bg-purple-50/10 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{patientName(r)}</td>
                                        <td className="px-6 py-4 text-gray-600">{recipientName(r)}</td>
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
                                            <div className="flex justify-end">
                                                {r.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleCancel(r.id)}
                                                        disabled={cancellingId === r.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-200 text-xs font-bold transition-colors disabled:opacity-50"
                                                        title="Cancelar referido"
                                                    >
                                                        {cancellingId === r.id ? (
                                                            <span className="loading loading-spinner loading-xs"></span>
                                                        ) : (
                                                            <Ban size={13} />
                                                        )}
                                                        Cancelar
                                                    </button>
                                                )}
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