"use client";

import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaLabs = ({ patient }: Props) => {
  const labResults = patient.labResults || [];

  const isWithinRange = (value: number, referenceRange?: string): boolean => {
    if (!referenceRange) return true;
    const match = referenceRange.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (!match) return true;
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    return value >= min && value <= max;
  };

  return (
    <div className="space-y-6">
      <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
          <FileText className="text-emerald-600" size={20} />
          Exámenes de Laboratorio
        </h3>

        {labResults.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            No hay exámenes de laboratorio registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-base-200 text-base-content/70 font-semibold border-b border-base-300">
                <tr>
                  <th className="px-4 sm:px-6 py-4">Examen</th>
                  <th className="px-4 sm:px-6 py-4">Fecha</th>
                  <th className="px-4 sm:px-6 py-4">Parámetros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50">
                {labResults.map((lab) => {
                  const params = lab.data ? Object.entries(lab.data) : [];
                  return (
                    <tr key={lab.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <FileText size={18} />
                          </div>
                          <span className="font-medium text-base-content">{lab.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-base-content/70">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(lab.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {params.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {params.map(([key, value]) => {
                              const numValue = parseFloat(value as string);
                              const inRange = !isNaN(numValue) && isWithinRange(numValue, lab.data?.[`${key}_range`]);
                              return (
                                <span
                                  key={key}
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    isNaN(numValue)
                                      ? 'bg-base-200 text-base-content/70'
                                      : inRange
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {key}: {String(value)}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-base-content/50 text-xs">Sin parámetros</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
