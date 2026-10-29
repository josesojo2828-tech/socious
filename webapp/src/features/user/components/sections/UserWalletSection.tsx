'use client';

import { WalletSummaryCard } from '../wallet/WalletSummaryCard';
import { Wallet, ShieldCheck, History } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export function UserWalletSection() {
  const { user } = useAuthStore();
  const balance = user?.wallet?.balance || 0;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Gestión de Billetera Digital
            </h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              Consulta tu saldo disponible y reporta nuevos pagos a tu cuenta.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/30 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Billetera Activa
          </span>
        </div>

        <WalletSummaryCard />
      </div>

      {/* Historial rápido / Información */}
      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
          <History className="w-4 h-4 text-base-content/70" />
          Información de Transacciones
        </h3>
        <p className="text-xs text-base-content/70 leading-relaxed">
          Los fondos recargados en tu billetera te permiten renovar tu suscripción a Nutringest, agregar licencias para nutricionistas adicionales y contratar servicios enterprise de forma automática sin interrupción.
        </p>
      </div>
    </div>
  );
}
