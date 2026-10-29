import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash2, UploadCloud, Calendar, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { useLabResults } from '../hooks/useLabResults';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { AddLabResultModal } from './AddLabResultModal';
import { LabResult } from '@/types/nutringest/lab-result.interface';
import { LabResultDetailModal } from './LabResultDetails';
import { ImagePreviewModal } from '@/features/community/components/ImagePreviewModal';

interface Props {
    patientId: string;
    onUpdate?: () => void;
}

export const LabResultsTab = ({ patientId, onUpdate }: Props) => {
    const { results, isLoading, fetchLabs, deleteLabResult, addLabResult } = useLabResults(patientId);
    const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
    const { openModal, closeModal } = useModalStore();

    useEffect(() => {
        fetchLabs();
    }, [fetchLabs]);

    const handleSubmit = async (data: any) => {
        const success = await addLabResult(data);
        if (success) {
            closeModal();
            if (onUpdate) onUpdate();
        }
        return success;
    };

    const handleOpenModal = () => {
        openModal(
            <AddLabResultModal
                isOpen={true}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />
        );
    };

    return (
        <>
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-base-content">Exámenes de Laboratorio</h2>
                    <button
                        onClick={handleOpenModal}
                        className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm"
                    >
                        <UploadCloud size={16} /> Subir Resultado
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Tarjeta para agregar rápido (Upload Placeholder) */}
                    <div
                        onClick={handleOpenModal}
                        className="border-2 border-dashed border-base-300 rounded-xl p-6 flex flex-col items-center justify-center text-base-content/50 hover:border-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer h-44"
                    >
                        <UploadCloud size={32} className="mb-2 text-emerald-600" />
                        <span className="text-sm font-bold text-base-content">Registrar Nuevo Examen</span>
                        <span className="text-xs text-base-content/50 mt-1">Adjuntar foto o valores</span>
                    </div>

                    {/* Loading State */}
                    {isLoading && results.length === 0 && (
                        <div className="col-span-full py-8 text-center text-base-content/50">Cargando exámenes...</div>
                    )}

                    {/* Listado de Archivos */}
                    {results.map((lab) => {
                        const isImage = lab.fileUrl && (lab.fileUrl.startsWith('data:image') || lab.fileUrl.match(/\.(png|jpg|jpeg|webp)($|\?)/i));

                        return (
                            <div
                                key={lab.id}
                                onClick={() => openModal(<LabResultDetailModal onClose={closeModal} labResult={lab} />)}
                                className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden"
                            >
                                <div>
                                    {/* Encabezado e Ícono */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${isImage ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                            {isImage ? <ImageIcon size={22} /> : <FileText size={22} />}
                                        </div>

                                        {/* Acciones al Hover */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isImage && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewImage({ src: lab.fileUrl!, title: lab.name });
                                                    }}
                                                    className="p-1.5 text-base-content/50 hover:text-emerald-600 hover:bg-base-200 rounded transition-colors"
                                                    title="Previsualizar Foto"
                                                >
                                                    <Maximize2 size={16} />
                                                </button>
                                            )}
                                            {lab.fileUrl && (
                                                <a
                                                    href={lab.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1.5 text-base-content/50 hover:text-emerald-600 hover:bg-base-200 rounded transition-colors"
                                                    title="Ver / Descargar"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm('¿Eliminar examen de laboratorio?')) {
                                                        await deleteLabResult(lab.id);
                                                        if (onUpdate) onUpdate();
                                                    }
                                                }}
                                                className="p-1.5 text-base-content/50 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Vista previa miniatura de la foto del examen si existe */}
                                    {isImage && (
                                        <div className="w-full h-24 mb-3 rounded-lg overflow-hidden bg-base-200 border border-base-300 relative group/thumb">
                                            <img src={lab.fileUrl} alt={lab.name} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[10px] bg-slate-900/80 text-white font-bold px-2 py-1 rounded-md backdrop-blur-xs flex items-center gap-1">
                                                    <Maximize2 size={10} /> Ampliar
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="font-bold text-base-content text-sm mb-1 truncate" title={lab.name}>{lab.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-base-content/70">
                                        <Calendar size={12} />
                                        {new Date(lab.date).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Footer con info de parámetros o adjunto */}
                                <div className="mt-3 pt-2 border-t border-base-300 flex items-center justify-between text-[11px]">
                                    {lab.data && Object.keys(lab.data).length > 0 ? (
                                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {Object.keys(lab.data).length} parámetros
                                        </span>
                                    ) : (
                                        <span className="text-base-content/50">Sin parámetros manuales</span>
                                    )}

                                    {lab.fileUrl && (
                                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                                            <ImageIcon size={12} /> Foto adjunta
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ImagePreviewModal
                src={previewImage?.src || null}
                title={previewImage?.title}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
};