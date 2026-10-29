"use client";

import React from 'react';
import { Utensils, CalendarDays, ChevronRight } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { PlanStatus } from '@/types/nutringest/nutritional-plan.interface';
import Link from 'next/link';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaPlans = ({ patient }: Props) => {
  const plans = patient.plans || [];

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.status === PlanStatus.ACTIVE && b.status !== PlanStatus.ACTIVE) return -1;
    if (a.status !== PlanStatus.ACTIVE && b.status === PlanStatus.ACTIVE) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
          <Utensils className="text-emerald-600" size={20} />
          Planes Nutricionales
        </h3>

        {plans.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            No hay planes nutricionales asignados.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-base-100 p-4 rounded-xl border border-base-300 hover:border-blue-300 transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    plan.status === PlanStatus.ACTIVE ? 'bg-green-100 text-green-600' : 'bg-base-200 text-base-content/50'
                  }`}>
                    <Utensils size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base-content">{plan.name}</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-base-content/70 mt-1">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        plan.status === PlanStatus.ACTIVE ? 'bg-green-50 text-green-700' : 'bg-base-200 text-base-content/70'
                      }`}>
                        {plan.status}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} /> {new Date(plan.startDate).toLocaleDateString()}
                      </span>
                      {plan.endDate && (
                        <>
                          <span>-</span>
                          <span>{new Date(plan.endDate).toLocaleDateString()}</span>
                        </>
                      )}
                      <span className="flex items-center gap-1 font-semibold">
                        {plan.kcalTarget} kcal
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-base-content/50 mt-1">
                      <span>P: {plan.proteinTarget}g</span>
                      <span>C: {plan.carbsTarget}g</span>
                      <span>G: {plan.fatsTarget}g</span>
                    </div>
                    {plan.assignedMenus && plan.assignedMenus.length > 0 && (
                      <div className="text-xs text-base-content/70 mt-1">
                        {plan.assignedMenus.length} menú(s) asignado(s)
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/dashboard/plans/${plan.id}`}
                  className="p-2 text-base-content/50 hover:text-emerald-600 hover:bg-base-200 rounded-lg transition-colors"
                  title="Ver Detalle"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
