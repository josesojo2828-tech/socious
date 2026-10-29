import React, { useState } from 'react';
import { X, FileText, Calendar, Info, Activity, Maximize2, Image as ImageIcon } from 'lucide-react';
import { ImagePreviewModal } from '@/features/community/components/ImagePreviewModal';

interface LabResult {
    id: string;
    name: string;
    date: string | Date;
    data?: Record<string, { value: number; unit: string; ref?: string }>;
    fileUrl?: string;
}

interface Props {
    onClose: () => void;
    labResult: LabResult | null;
}

export const LabResultDetailModal = ({ onClose, labResult }: Props) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!labResult) return null;

    const parameters = labResult.data ? Object.entries(labResult.data) : [];
    const hasData = parameters.length > 0;
    const isImage = labResult.fileUrl && (labResult.fileUrl.startsWith('data:image') || labResult.fileUrl.match(/\.(png|jpg|jpeg|webp)($|\?)/i));

    return (
        <>
            <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-base-200 flex justify-between items-start bg-base-200/50 shrink-0">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mt-1">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base-content text-lg leading-tight">{labResult.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
                                <Calendar size={14} />
                                <span>{new Date(labResult.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-base-300 rounded-full text-base-content/50 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Foto / Documento Adjunto de Examen */}
                    {labResult.fileUrl && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-base-content/90 uppercase tracking-wide">
                                <ImageIcon size={16} className="text-emerald-500" />
                                Documento / Foto del Examen
                            </div>

                            {isImage ? (
                                <div className="relative group rounded-xl overflow-hidden border border-base-300 bg-slate-900/5 max-h-64 flex items-center justify-center">
                                    <img
                                        src={labResult.fileUrl}
                                        alt={labResult.name}
                                        className="w-full max-h-64 object-contain"
                                    />
                                    <button
                                        onClick={() => setPreviewImage(labResult.fileUrl!)}
                                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-sm backdrop-blur-xs"
                                    >
                                        <Maximize2 size={18} />
                                        Ampliar Foto del Examen
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-base-300 bg-base-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-base-content">Archivo Adjunto</p>
                                            <p className="text-[11px] text-base-content/60">Documento de laboratorio</p>
                                        </div>
                                    </div>
                                    <a
                                        href={labResult.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-base-100 border border-base-300 text-base-content/90 text-xs font-semibold rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                    >
                                        Ver Documento
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {hasData ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-base-content/90 uppercase tracking-wide pb-2 border-b border-base-200">
                                <Activity size={16} className="text-emerald-500" />
                                Resultados del Análisis
                            </div>

                            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-base-200 text-base-content/60 font-semibold border-b border-base-300">
                                        <tr>
                                            <th className="px-4 py-3 w-1/2">Parámetro</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                            <th className="px-4 py-3 text-base-content/50 w-1/4">Unidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {parameters.map(([key, details]: [string, any]) => (
                                            <tr key={key} className="hover:bg-emerald-50/30 transition-colors group">
                                                <td className="px-4 py-3 font-medium text-base-content">
                                                    {key}
                                                    {details.ref && (
                                                        <span className="block text-[10px] text-base-content/50 font-normal mt-0.5">
                                                            Ref: {details.ref}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30 group-hover:bg-emerald-100/50 transition-colors">
                                                    {details.value}
                                                </td>
                                                <td className="px-4 py-3 text-base-content/60 text-xs">
                                                    {details.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : !labResult.fileUrl && (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-base-200 rounded-xl border border-dashed border-base-300">
                            <Info size={32} className="text-base-content/40 mb-2" />
                            <p className="text-base-content/60 font-medium">No hay datos manuales ni archivos registrados.</p>
                        </div>
                    )}

                    {/* Nota */}
                    <div className="flex items-start gap-2 bg-emerald-50 p-3 rounded-lg text-xs text-emerald-700 border border-emerald-100">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p>
                            Estos valores son referenciales. Siempre verifique con el documento original o la fuente del laboratorio.
                        </p>
                    </div>
                </div>

                {/* Footer Actions (Si hay archivo adjunto) */}
                {labResult.fileUrl && (
                    <div className="p-4 border-t border-base-200 bg-base-200 flex justify-end shrink-0">
                        <a
                            href={labResult.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-base-100 border border-base-300 text-base-content/90 rounded-lg text-sm font-medium hover:bg-base-200 hover:text-emerald-600 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <FileText size={16} />
                            Abrir Documento Original
                        </a>
                    </div>
                )}
            </div>

            <ImagePreviewModal
                src={previewImage}
                title={labResult.name}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
};