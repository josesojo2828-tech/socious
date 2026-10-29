"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  CreditCard,
  Building2,
  DollarSign,
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
  BookOpen,
} from "lucide-react";
import type { RecursoDidactico } from "../data/recursos";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";

interface RecursoCheckoutModalProps {
  isOpen: boolean;
  recurso: RecursoDidactico | null;
  onClose: () => void;
  onSuccessPurchase: (recursoId: string) => void;
}

export function RecursoCheckoutModal({
  isOpen,
  recurso,
  onClose,
  onSuccessPurchase,
}: RecursoCheckoutModalProps) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "PAGO_MOVIL" | "ZELLE">("WALLET");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  if (!isOpen || !recurso) return null;

  const itemPrice = recurso.price || 14.99;
  const platformFee = Math.round(itemPrice * 0.1 * 100) / 100; // 10% retención Nutringest
  const creatorEarnings = Math.round((itemPrice - platformFee) * 100) / 100; // 90% para el autor

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simular latencia de transacción de pago y ledger de retención de 10%
      await new Promise((res) => setTimeout(res, 1200));

      setIsPurchased(true);
      addToast({
        type: "success",
        title: "¡Compra realizada con éxito!",
        message: `Has desbloqueado "${recurso.title}". El creador recibirá $${creatorEarnings} USD netos.`,
      });

      setTimeout(() => {
        onSuccessPurchase(recurso.id);
        onClose();
        setIsPurchased(false);
      }, 1800);
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error al procesar pago",
        message: "No se pudo completar la transacción. Verifica tus datos.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden my-8">
        
        {/* Header de la Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Marketplace Nutringest
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Adquirir Recurso de Pago Único
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Acceso de por vida a la guía o masterclass con certificación oficial.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPurchased ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-xl font-black text-slate-900">¡Acceso Desbloqueado!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Ya tienes acceso ilimitado a <strong>"{recurso.title}"</strong> en tu biblioteca del Campus.
            </p>
          </div>
        ) : (
          <form onSubmit={handleProcessPayment} className="space-y-5">
            {/* Card del Producto */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs shrink-0">
                  {recurso.icon || "🎓"}
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                    {recurso.title}
                  </h5>
                  <span className="text-xs text-slate-500 font-medium">
                    Autor: {recurso.author?.name || "Nutricionista Creador"}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400 font-bold uppercase block">Precio final</span>
                <span className="text-lg font-black text-emerald-600">${itemPrice} USD</span>
              </div>
            </div>

            {/* Desglose Transparente de la Plataforma (Comisión 10%) */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Monto Bruto al Creador (90%):
                </span>
                <span className="text-slate-900 font-extrabold">${creatorEarnings} USD</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Comisión de Retención Nutringest (10%):</span>
                <span>${platformFee} USD</span>
              </div>
            </div>

            {/* Selección de Método de Pago */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Seleccionar Método de Pago
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("WALLET")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === "WALLET"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <span>Billetera</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("PAGO_MOVIL")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === "PAGO_MOVIL"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Pago Móvil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("ZELLE")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === "ZELLE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span>Zelle / Card</span>
                </button>
              </div>
            </div>

            {/* Inputs según método */}
            {paymentMethod !== "WALLET" && (
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Número de Referencia *
                </label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej: 84930219"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            {/* Botón de Confirmación */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Procesando pago...</span>
                ) : (
                  <>
                    <span>Confirmar y Pagar ${itemPrice} USD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
