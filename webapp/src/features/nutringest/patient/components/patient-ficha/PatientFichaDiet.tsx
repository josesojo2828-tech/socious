"use client";

import React from 'react';
import { Utensils, Zap } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { PlanStatus } from '@/types/nutringest/nutritional-plan.interface';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaDiet = ({ patient }: Props) => {
  const activePlan = patient.plans?.find((p: any) => p.status === PlanStatus.ACTIVE);

  if (!activePlan) {
    return (
      <div className="space-y-6">
        <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
            <Utensils className="text-emerald-600" size={20} />
            Dieta Asignada
          </h3>
          <div className="text-center py-12 text-base-content/50">
            No hay plan dietético activo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
          <Utensils className="text-emerald-600" size={20} />
          Dieta Asignada
        </h3>

        {/* Plan Header */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-base-100 p-4 rounded-xl border border-emerald-500/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-bold text-base-content">{activePlan.name}</h4>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              Activo
            </span>
          </div>
          <div className="text-sm text-base-content/70">
            Meta: <strong>{activePlan.kcalTarget} kcal</strong> | 
            P: {activePlan.proteinTarget}g | C: {activePlan.carbsTarget}g | G: {activePlan.fatsTarget}g
          </div>
        </div>

        {/* Menús Asignados */}
        {activePlan.assignedMenus && activePlan.assignedMenus.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2 mb-3">
              <Utensils size={14} /> Menús Asignados
            </h4>
            <div className="space-y-3">
              {activePlan.assignedMenus.map((assigned: any) => (
                <div key={assigned.id} className="bg-base-200 rounded-xl p-4 border border-base-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-emerald-600 uppercase">
                        {assigned.eatingMoment || 'Sin momento'}
                      </span>
                      <h5 className="font-bold text-base-content">{assigned.menu?.name || 'Menú'}</h5>
                    </div>
                    {assigned.menu?.totalKcal && (
                      <span className="text-xs font-bold text-base-content/70 bg-base-100 px-2 py-1 rounded">
                        {assigned.menu.totalKcal} kcal
                      </span>
                    )}
                  </div>
                  {assigned.menu?.items && assigned.menu.items.length > 0 && (
                    <ul className="text-sm text-base-content/70 space-y-1">
                      {assigned.menu.items.slice(0, 5).map((item: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {item.name}
                        </li>
                      ))}
                      {assigned.menu.items.length > 5 && (
                        <li className="text-xs text-base-content/50">
                          +{assigned.menu.items.length - 5} más...
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intercambios Asignados */}
        {activePlan.assignedLists && activePlan.assignedLists.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2 mb-3">
              <Zap size={14} className="text-yellow-500" /> Intercambios Libres
            </h4>
            <div className="space-y-2">
              {activePlan.assignedLists.map((assigned: any) => (
                <div key={assigned.id} className="bg-base-200 rounded-lg p-3 border border-base-300 flex justify-between items-center">
                  <div>
                    <span className="font-medium text-base-content text-sm">
                      {assigned.exchangeList?.name || 'Lista de intercambio'}
                    </span>
                    {assigned.eatingMoment && (
                      <span className="text-xs text-base-content/70 ml-2">({assigned.eatingMoment})</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-base-content/70">
                    {assigned.portions} porción(es)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suplementos */}
        {activePlan.supplements && activePlan.supplements.length > 0 && (
          <div>
            <h4 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2 mb-3">
              <Zap size={14} className="text-yellow-500 fill-yellow-100" /> Suplementación
            </h4>
            <div className="space-y-2">
              {activePlan.supplements.map((supp: any) => (
                <div key={supp.id} className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-base-content text-sm">{supp.name}</span>
                    <span className="text-xs text-base-content/70">{supp.dose}</span>
                  </div>
                  <span className="text-xs text-base-content/70">{supp.frequency}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
