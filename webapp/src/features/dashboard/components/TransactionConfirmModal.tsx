"use client";

import { useState } from "react";
import { X, CreditCard, CheckCircle2, AlertTriangle, User, DollarSign } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";

interface TransactionConfirmModalProps {
  transaction: {
    id: string;
    referenceCode?: string;
    amount: number;
    status: string;
    type: string;
    createdAt?: string;
    paymentMethod?: {
      paymentMethod?: {
        name: string;
      };
    };
    user?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionConfirmModal({
  transaction,
  action,
  onClose,
  onSuccess,
}: TransactionConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isApprove = action === "approve";

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      const targetStatus = isApprove ? "SUCCESS" : "FAILED";
      await apiClient.post(`/api/transactions/set/status/${transaction.id}`, {
        status: targetStatus,
      });
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Ocurrió un error al procesar el cambio de estado de la transacción."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {isApprove ? (
            <CheckCircle2 className="text-emerald-500" size={22} />
          ) : (
            <AlertTriangle className="text-rose-500" size={22} />
          )}
          <h2 className="text-lg font-bold text-slate-900">
            {isApprove ? "Aprobar Transacción" : "Rechazar Transacción"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          disabled={loading}
        >
          <X size={20} />
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* DETALLES DE LA TRANSACCIÓN */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
          <span className="text-slate-500 font-medium">Referencia:</span>
          <span className="font-mono font-bold text-slate-800">
            {transaction.referenceCode || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
          <span className="text-slate-500 font-medium">Monto:</span>
          <span className="font-bold text-slate-900 flex items-center gap-0.5">
            <DollarSign size={14} className="text-slate-400" />
            {Number(transaction.amount || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
          <span className="text-slate-500 font-medium">Usuario:</span>
          <span className="text-slate-700 font-medium flex items-center gap-1">
            <User size={14} className="text-slate-400" />
            {transaction.user?.email || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-medium">Método de Pago:</span>
          <span className="text-slate-700 font-semibold flex items-center gap-1">
            <CreditCard size={14} className="text-slate-400" />
            {transaction.paymentMethod?.paymentMethod?.name || "Manual"}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed">
        {isApprove
          ? "Al aprobar este pago, se confirmará la transacción y el saldo se acreditará automáticamente en la billetera del usuario."
          : "Al rechazar esta transacción, el estado cambiará a fallido y el pago no será acreditado."}
      </p>

      {/* FOOTER */}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant={isApprove ? "primary" : "error"}
          className={
            isApprove
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              : "bg-rose-600 hover:bg-rose-700 text-white border-none"
          }
          onClick={handleConfirm}
          loading={loading}
        >
          {isApprove ? "Aprobar Pago" : "Rechazar Pago"}
        </Button>
      </div>
    </div>
  );
}
