'use client';

import { useState } from 'react';
import { Users, Plus, Minus, Sparkles, X, Info, ShieldCheck } from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { organizationService } from '../services/organization.service';
import { CLINIC_BILLING_CONFIG } from '../config/billing.config';

const SEAT_UNIT_PRICE = CLINIC_BILLING_CONFIG.extraSeatPrice; // USD / mes por nutricionista adicional

interface SeatExpansionModalProps {
  orgId: string;
  currentMaxSeats: number;
  currentActiveSeats: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMaxSeats: number) => void;
}

export function SeatExpansionModal({
  orgId,
  currentMaxSeats,
  currentActiveSeats,
  isOpen,
  onClose,
  onSuccess,
}: SeatExpansionModalProps) {
  const { addToast } = useToastStore();
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const totalPrice = additionalSeats * SEAT_UNIT_PRICE;
  const targetMaxSeats = (currentMaxSeats || CLINIC_BILLING_CONFIG.includedSeats) + additionalSeats;

  const handleConfirmPurchase = async () => {
    setLoading(true);
    try {
      const res = await organizationService.purchaseSeats(orgId, additionalSeats);
      if (res.success) {
        const newCapacity = res.newMaxSeats || targetMaxSeats;
        addToast({
          type: 'success',
          title: '¡Capacidad Ampliada!',
          message: `Se agregaron ${additionalSeats} cupos adicionales. Nueva capacidad: ${newCapacity} nutricionistas. Se cobrará en tu próxima renovación.`,
        });
        if (onSuccess) onSuccess(newCapacity);
        onClose();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error al actualizar capacidad',
        message: err?.response?.data?.message || 'No se pudo completar el aumento de capacidad.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fade-in">
      <div className="relative w-full max-w-2xl bg-base-100 border border-base-300 rounded-2xl shadow-2xl overflow-hidden text-base-content flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden shrink-0">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Ampliación de Capacidad</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ${SEAT_UNIT_PRICE} USD / mes
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Agrega más licencias para nutricionistas a tu clínica en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Current Capacity Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-base-200 border border-base-300">
              <span className="text-base-content/50 block font-medium">Capacidad Actual</span>
              <strong className="text-base-content text-base font-black">{currentActiveSeats} / {currentMaxSeats} Nutris</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
              <span className="text-indigo-600 dark:text-indigo-400 block font-medium">Nueva Capacidad</span>
              <strong className="text-indigo-950 dark:text-indigo-200 text-base font-black">{targetMaxSeats} Nutris (+{additionalSeats})</strong>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content block">
              Seleccionar Cupos Adicionales:
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-base-300 bg-base-200 p-1">
                <button
                  onClick={() => setAdditionalSeats(Math.max(1, additionalSeats - 1))}
                  disabled={additionalSeats <= 1}
                  className="p-2 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 disabled:opacity-40 text-base-content transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="w-14 text-center text-lg font-black text-base-content">
                  +{additionalSeats}
                </span>

                <button
                  onClick={() => setAdditionalSeats(additionalSeats + 1)}
                  className="p-2 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 text-base-content transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 5, 10].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAdditionalSeats(preset)}
                    className={`px-3 py-2 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                      additionalSeats === preset
                        ? 'bg-primary text-primary-content border-primary shadow-xs'
                        : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 rounded-xl bg-base-200 border border-base-300 text-base-content space-y-3">
            <div className="flex justify-between items-center text-xs text-base-content/70">
              <span>{additionalSeats} Cupo(s) × ${SEAT_UNIT_PRICE}.00 USD / mes</span>
              <span className="font-bold text-base-content">+${totalPrice}.00 USD / mes</span>
            </div>
            <div className="border-t border-base-300 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold">Aumento Recurrente Mensual</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">+${totalPrice}.00 USD / mes</span>
            </div>
          </div>

          {/* Deferred Billing Info Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-400">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Cobro en Renovación de Suscripción
            </div>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              No se realizará ningún cobro ni descuento inmediato. Los nuevos cupos (+{additionalSeats}) se habilitarán al instante y el cargo adicional de <strong>+${totalPrice}.00 USD/mes</strong> se incluirá en el ciclo de renovación de tu suscripción.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-base-200 border-t border-base-300 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-base-content/70 hover:bg-base-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmPurchase}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Actualizando...' : 'Confirmar Aumento de Licencias'}
          </button>
        </div>

      </div>
    </div>
  );
}
