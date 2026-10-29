import React from "react";
import { MapPin, Check } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { useModalStore } from "@/shared/store/ui/useModalStore";

interface ConfirmLocationModalProps {
    lat: number;
    lng: number;
    onSave: (lat: number, lng: number) => Promise<void> | void;
}

export const ConfirmLocationModal: React.FC<ConfirmLocationModalProps> = ({ lat, lng, onSave }) => {
    const { closeModal } = useModalStore();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            await onSave(lat, lng);
            closeModal();
        } catch (error) {
            console.error("Error al guardar la ubicación:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 w-full">
            {/* Icono de Cabecera */}
            <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                    <MapPin size={32} />
                </div>
            </div>

            {/* Texto Informativo */}
            <div className="text-center space-y-2 mb-8">
                <h3 className="text-xl font-black text-slate-800">¿Guardar ubicación?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Esta será la dirección que verán tus pacientes para sus citas presenciales.
                </p>
            </div>

            {/* Visualización de Coordenadas */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitud</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitud</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{lng.toFixed(6)}</span>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-3">
                <Button
                    onClick={handleConfirm}
                    disabled={isSaving}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check size={18} />
                            Sí, guardar ubicación
                        </>
                    )}
                </Button>

                <button
                    onClick={closeModal}
                    className="w-full h-12 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                >
                    Cancelar y ajustar
                </button>
            </div>
        </div>
    );
};