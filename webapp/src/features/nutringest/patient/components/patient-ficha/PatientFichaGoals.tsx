"use client";

import React from 'react';
import { Target, Trophy, Calendar } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { GoalType } from '@/types/nutringest/goal.interface';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaGoals = ({ patient }: Props) => {
  const goals = patient.goals || [];

  const getUnit = (type: string) => {
    switch (type) {
      case GoalType.WEIGHT:
        return ' kg';
      case GoalType.MEASUREMENT:
        return ' cm';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
          <Target className="text-emerald-600" size={20} />
          Objetivos Terapéuticos
        </h3>

        {goals.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            No hay objetivos definidos.
          </div>
        ) : (
          <div className="space-y-4">
            {[...goals]
              .sort((a, b) => (a.isAchieved === b.isAchieved ? 0 : a.isAchieved ? 1 : -1))
              .map((goal) => {
                const progress = goal.targetValue && goal.startValue
                  ? Math.min(Math.max(((goal.currentValue - goal.startValue) / (goal.targetValue - goal.startValue)) * 100, 0), 100)
                  : 0;

                return (
                  <div
                    key={goal.id}
                    className={`relative bg-base-100 rounded-2xl border transition-all duration-300 overflow-hidden ${
                      goal.isAchieved
                        ? 'border-green-200 shadow-sm bg-green-50/30'
                        : 'border-base-300 shadow-sm'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${goal.isAchieved ? 'bg-green-500' : 'bg-emerald-500'}`} />

                    <div className="p-5 pl-7">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-1 ${goal.isAchieved ? 'bg-green-100 text-green-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {goal.isAchieved ? <Trophy size={20} /> : <Target size={20} />}
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block ${
                              goal.type === GoalType.WEIGHT ? 'bg-orange-100 text-orange-700' :
                              goal.type === GoalType.HABIT ? 'bg-purple-100 text-purple-700' : 'bg-base-200 text-base-content/70'
                            }`}>
                              {goal.type}
                            </span>
                            <h3 className={`text-lg font-bold ${goal.isAchieved ? 'text-green-900' : 'text-base-content'}`}>
                              {goal.title}
                            </h3>
                            {goal.deadline && (
                              <div className="flex items-center gap-1 text-xs text-base-content/50 mt-1">
                                <Calendar size={12} />
                                <span>Meta: {new Date(goal.deadline).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-sm text-base-content/70 mt-3 pl-1 leading-relaxed whitespace-pre-wrap">
                          {goal.description}
                        </p>
                      )}

                      {(goal.targetValue !== null && goal.startValue !== null) && (
                        <div className="mt-4 bg-base-200 rounded-xl p-4 border border-base-300">
                          <div className="flex justify-between items-end mb-2">
                            <div>
                              <span className="text-xs text-base-content/70 font-medium">Progreso Actual</span>
                              <div className="text-2xl font-black text-base-content flex items-baseline gap-1">
                                {goal.currentValue}
                                <span className="text-sm font-medium text-base-content/50">
                                  {getUnit(goal.type)} / {goal.targetValue}{getUnit(goal.type)}
                                </span>
                              </div>
                            </div>
                            <span className="text-xl font-bold text-emerald-600">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-base-300 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                goal.isAchieved ? 'bg-green-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[10px] text-base-content/50 font-medium uppercase tracking-wide">
                            <span>Inicio: {goal.startValue}{getUnit(goal.type)}</span>
                            <span>Objetivo: {goal.targetValue}{getUnit(goal.type)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
