'use client';

import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { PresentationPlan } from '../subscription/PresentationPlan';
import { Sparkles, Calendar, CheckCircle2, Award } from 'lucide-react';
import Link from 'next/link';

export function UserSubscriptionSection() {
  const { user } = useAuthStore();
  const sub = user?.subscriptions ? user.subscriptions[0] : null;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Suscripción & Plan Activo
            </h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              Administra tu plan de suscripción y estado del ciclo de facturación.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
            {sub ? sub.plan.name : 'Plan Estándar'}
          </span>
        </div>

        {sub ? (
          <PresentationPlan entity={sub} Reload={() => window.location.reload()} />
        ) : (
          <div className="p-8 text-center bg-base-200 rounded-xl border border-base-300 space-y-3">
            <Award className="w-10 h-10 text-primary mx-auto" />
            <h3 className="text-base font-bold text-base-content">Plan Profesional Activo</h3>
            <p className="text-xs text-base-content/70 max-w-md mx-auto">
              Tienes acceso a las funcionalidades del ecosistema Nutringest. Puedes solicitar mejoras o licencias grupales cuando lo desees.
            </p>
          </div>
        )}
      </div>

      {/* Beneficios del Plan */}
      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-base-content">Beneficios Incluidos en tu Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-base-content/70 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Generación ilimitada de dietas y menús</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Gestión integral de historias clínicas e impresiones</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Acreditación profesional / clínica verificada</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Soporte prioritario y almacenamiento en la nube</span>
          </div>
        </div>
      </div>
    </div>
  );
}
