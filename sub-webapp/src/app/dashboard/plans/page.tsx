'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { SubscriptionPlan } from '@/types';

const PLAN_FEATURES: Record<string, string[]> = {
  Básico: [
    'Hasta 50 pacientes activos',
    'Creación de dietas y menús estándar',
    'Cálculo calórico básico',
    'Expediente clínico digital esencial',
    'Soporte por correo (48h)',
    '1 usuario administrador',
  ],
  Profesional: [
    'Pacientes ilimitados',
    'Módulo clínico avanzado',
    'Software de bioimpedancia',
    'Portal web para pacientes',
    'Facturación automática integrada',
    'Soporte prioritario 24/7',
    'Exportación de informes en PDF',
  ],
  Clínica: [
    'Todo lo incluido en Profesional',
    'Hasta 10 licencias',
    'Roles de equipo y permisos',
    'Integración con API externas',
    'Reportes analíticos avanzados',
    'Dominio personalizado',
    'Gestor de cuenta dedicado',
  ],
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, userRes] = await Promise.allSettled([
          apiClient.get('/subscription/plans'),
          apiClient.get('/auth/me'),
        ]);
        if (plansRes.status === 'fulfilled') {
          const items = plansRes.value.data?.list || plansRes.value.data || [];
          setPlans(Array.isArray(items) ? items : []);
        }
        if (userRes.status === 'fulfilled') {
          const sub = userRes.value.data?.subscriptions?.[0];
          if (sub?.plan?.id) setCurrentPlanId(sub.plan.id);
        }
      } catch {
        // Silent fail
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Selecciona tu Plan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige el plan que mejor se adapte a tu consulta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(plans.length > 0 ? plans : [{ id: 'basico', name: 'Básico', price: 19.99 }, { id: 'profesional', name: 'Profesional', price: 49.99 }, { id: 'clinica', name: 'Clínica', price: 99.99 }]).map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isRecommended = plan.name === 'Profesional' || plan.id === 'profesional';
          const features = PLAN_FEATURES[plan.name] || PLAN_FEATURES[plan.name?.charAt(0).toUpperCase() + plan.name?.slice(1).toLowerCase() || ''] || [];

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-6 relative ${
                isRecommended
                  ? 'border-[#7c3aed] border-2 shadow-lg'
                  : 'border-gray-100'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#7c3aed] text-white text-xs font-bold px-4 py-1 rounded-full">
                    RECOMENDADO
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-black text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 text-sm"> / mes</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-[#7c3aed] mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-semibold text-sm text-center border border-emerald-200">
                  Plan Actual
                </div>
              ) : (
                <button className="w-full py-3 bg-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:bg-[#6d28d9] transition-all flex items-center justify-center gap-2">
                  Seleccionar Plan
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trust banner */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-500">
          Transacciones Seguras · SSL 256 bits · Garantía de reembolso de 14 días
        </p>
      </div>
    </div>
  );
}
