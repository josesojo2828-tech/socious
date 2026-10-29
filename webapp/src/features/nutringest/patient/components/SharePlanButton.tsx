import React, { useState } from 'react';
import { Share, Copy, Check, X } from 'lucide-react';
import { NutritionalPlan } from '@/types/nutringest/nutritional-plan.interface';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';

interface Props {
    planId: string;
    plan: NutritionalPlan
}

export const SharePlanButton: React.FC<Props> = ({ planId, plan }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);
    const { addToast } = useToastStore();

    // 1. Función para generar el token en el Backend
    const handleGenerateLink = async () => {
        setLoading(true);
        try {
            // Ajusta la URL a tu endpoint real
            const response = await apiClient.post(`/api/plans/${planId}/share`);

            const data = await response.data.entity;
            const url = `${window.location.origin}/shared/${data.shareToken}`;

            setShareLink(url);
            setIsOpen(true); // Abrimos el modal
        } catch (error) {
            console.error(error);
            alert('No se pudo generar el enlace compartido.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Función para copiar al portapapeles
    const handleCopy = () => {
        SetCopu(shareLink);
    };

    const SetCopu = (tk: string) => {
        const origin = window.location.origin;
        const fullLink = `${origin}/patient/shared/${tk}`;
        navigator.clipboard.writeText(fullLink);
        setCopied(true);
        addToast({ message:'Enlace copiado al portapapeles', type:'success' });
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <>
            {
                plan && plan.isShared && plan.shareToken && plan.shareToken.length > 0
                    ? (
                        <button
                            onClick={() => SetCopu(`${plan.shareToken}`)}
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content/90 hover:bg-base-200 gap-2 transition-all"
                        >
                            <Copy size={16} /> { copied ? 'Copiado' : 'Copiar' }
                        </button>
                    )
                    : (
                        <button
                            onClick={handleGenerateLink}
                            disabled={loading}
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content/90 hover:bg-base-200 gap-2 transition-all"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                                <Share size={16} />
                            )}
                            {loading ? 'Generando...' : 'Compartir'}
                        </button>
                    )
            }
            {/* --- MODAL (DaisyUI / Tailwind) --- */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">

                        {/* Header del Modal */}
                        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Share size={20} /> Compartir Plan Nutricional
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-emerald-700 p-1 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body del Modal */}
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-base-content/70">
                                Este enlace permite al paciente ver su plan sin iniciar sesión.
                            </p>

                            <div className="flex items-center gap-2">
                                {/* Input Readonly */}
                                <input
                                    type="text"
                                    readOnly
                                    value={shareLink}
                                    className="input input-bordered w-full text-sm bg-base-200 text-base-content/70 focus:outline-none"
                                />

                                {/* Botón Copiar */}
                                <button
                                    onClick={handleCopy}
                                    className={`btn ${copied ? 'btn-success text-white' : 'btn-neutral'} btn-square`}
                                    title="Copiar enlace"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>

                            {copied && (
                                <p className="text-xs text-green-600 font-medium text-center animate-pulse">
                                    ¡Enlace copiado al portapapeles!
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-base-200 flex justify-end">
                            <button className="btn btn-sm btn-ghost" onClick={() => setIsOpen(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
