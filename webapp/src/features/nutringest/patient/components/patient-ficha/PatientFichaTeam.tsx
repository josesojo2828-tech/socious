"use client";

import React, { useState } from 'react';
import { Users, Info } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { PatientCareTeamSection } from '../PatientCareTeamSection';
import { PatientReferralsHistory } from '../PatientReferralsHistory';

interface Props {
    patient: PatientDetail;
}

export const PatientFichaTeam = ({ patient }: Props) => {
    const [members, setMembers] = useState<any[]>([]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <Users className="text-emerald-600" size={20} />
                    Equipo de Cuidado
                </h3>
                <p className="text-xs text-base-content/70 mt-0.5">
                    Profesionales que conforman tu equipo de salud.
                </p>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-info/10 border border-info/20 text-info text-xs">
                <Info size={15} className="shrink-0 mt-0.5" />
                Vista de solo lectura — para modificar el equipo, contactá a tu nutricionista.
            </div>

            <PatientCareTeamSection
                patientId={patient.id}
                refreshToken={0}
                onMembersChange={setMembers}
                readOnly
            />

            <PatientReferralsHistory patientId={patient.id} refreshToken={0} />
        </div>
    );
};
