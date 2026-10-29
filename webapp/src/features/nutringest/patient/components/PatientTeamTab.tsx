"use client";

import React, { useState } from "react";
import { Users, UserPlus, Info } from "lucide-react";
import { PatientCareTeamSection } from "./PatientCareTeamSection";
import { PatientReferralsHistory } from "./PatientReferralsHistory";
import { AddCollaboratorModal } from "./AddCollaboratorModal";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useTranslation } from "@/context/i18n.context";
import type { PatientTeamMember } from "@/types/nutringest/patient-referral.interface";

interface Props {
    patientId: string;
    // Vista de solo lectura: oculta "Agregar colaborador" y las acciones de gestión.
    readOnly?: boolean;
}

export const PatientTeamTab = ({ patientId, readOnly }: Props) => {
    const { t } = useTranslation();
    const { openModal, closeModal } = useModalStore();
    const [refreshToken, setRefreshToken] = useState(0);
    const [members, setMembers] = useState<PatientTeamMember[]>([]);

    const refresh = () => setRefreshToken((n) => n + 1);

    const handleOpenAddCollaborator = () => {
        openModal(
            <AddCollaboratorModal
                isOpen={true}
                patientId={patientId}
                onClose={closeModal}
                onSuccess={refresh}
            />,
            { size: "md" },
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                        <Users className="text-emerald-600" size={20} />
                        Equipo y referidos
                    </h3>
                    <p className="text-xs text-base-content/70 mt-0.5">
                        Gestioná el equipo de cuidado y revisá el historial de referidos del paciente.
                    </p>
                </div>
                {!readOnly && (
                    <button
                        onClick={handleOpenAddCollaborator}
                        className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm shrink-0"
                    >
                        <UserPlus size={16} /> Agregar colaborador
                    </button>
                )}
            </div>

            {readOnly && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs">
                    <Info size={15} className="shrink-0 mt-0.5" />
                    {t("dashboard.patients.detail.team.readOnlyBanner")}
                </div>
            )}

            <PatientCareTeamSection
                patientId={patientId}
                refreshToken={refreshToken}
                onMembersChange={setMembers}
                onReferralCreated={refresh}
                readOnly={readOnly}
            />

            <PatientReferralsHistory patientId={patientId} refreshToken={refreshToken} />
        </div>
    );
};
