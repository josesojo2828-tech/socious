import { apiClient } from "@/shared/api/api.client";
import { PatientReferralEndpoints } from "./patient-referral.endpoint";
import {
    AddCollaboratorPayload,
    ChangeRolePayload,
    CollaboratorSearchResult,
    CreateReferralPayload,
    InviteCollaboratorPayload,
    PatientReferral,
    PatientReferralStatus,
    PatientTeamMember,
    ReferralMutationResponse,
    RespondReferralPayload,
    TeamMemberMutationResponse,
} from "@/types/nutringest/patient-referral.interface";

export const PatientReferralService = {
    // GET: Referidos entrantes (destino = nutricionista logueado)
    getIncoming: async (status: PatientReferralStatus = 'PENDING') => {
        return apiClient.get<PatientReferral[]>(
            PatientReferralEndpoints.actions.incoming(`status=${status}`),
        );
    },

    // GET: Referidos salientes (origen = nutricionista logueado)
    getOutgoing: async (status: PatientReferralStatus = 'PENDING') => {
        return apiClient.get<PatientReferral[]>(
            PatientReferralEndpoints.actions.outgoing(`status=${status}`),
        );
    },

    // GET: Detalle de un referido
    getById: async (id: string) => {
        return apiClient.get<PatientReferral>(PatientReferralEndpoints.actions.detail(id));
    },

    // POST: Solicitar referido
    create: async (data: CreateReferralPayload) => {
        return apiClient.post<ReferralMutationResponse>(PatientReferralEndpoints.actions.create(), data);
    },

    // POST: Aceptar referido (destinatario)
    accept: async (id: string, data?: RespondReferralPayload) => {
        return apiClient.post<ReferralMutationResponse>(PatientReferralEndpoints.actions.accept(id), data);
    },

    // POST: Rechazar referido (destinatario)
    reject: async (id: string, data?: RespondReferralPayload) => {
        return apiClient.post<ReferralMutationResponse>(PatientReferralEndpoints.actions.reject(id), data);
    },

    // POST: Cancelar referido (remitente)
    cancel: async (id: string) => {
        return apiClient.post<ReferralMutationResponse>(PatientReferralEndpoints.actions.cancel(id));
    },

    // GET: Equipo de cuidado activo de un paciente
    getTeam: async (patientId: string) => {
        return apiClient.get<PatientTeamMember[]>(PatientReferralEndpoints.actions.team(patientId));
    },

    // GET: Historial de referidos de un paciente (todos los estados)
    getHistoryByPatient: async (patientId: string) => {
        return apiClient.get<PatientReferral[]>(PatientReferralEndpoints.actions.history(patientId));
    },

    // GET: Buscar nutricionistas colaboradores por email (solo plan PREMIUM/Clínica)
    searchCollaborators: async (email: string) => {
        return apiClient.get<CollaboratorSearchResult[]>(
            PatientReferralEndpoints.actions.searchCollaborators(email),
        );
    },

    // POST: Invitar colaborador por email (crea PatientReferral tipo COLLABORATOR)
    inviteCollaborator: async (patientId: string, data: InviteCollaboratorPayload) => {
        return apiClient.post<ReferralMutationResponse>(
            PatientReferralEndpoints.actions.inviteCollaborator(patientId),
            data,
        );
    },

    // POST: Agregar colaborador directo al equipo de cuidado (SUPPORT, sin flujo de referido)
    addCollaborator: async (patientId: string, data: AddCollaboratorPayload) => {
        return apiClient.post<TeamMemberMutationResponse>(
            PatientReferralEndpoints.actions.addCollaborator(patientId),
            data,
        );
    },

    // PATCH: Cambiar rol de un miembro del equipo
    changeRole: async (patientId: string, nutritionistId: string, data: ChangeRolePayload) => {
        return apiClient.patch<TeamMemberMutationResponse>(
            PatientReferralEndpoints.actions.changeRole(patientId, nutritionistId),
            data,
        );
    },

    // DELETE: Remover un miembro del equipo (soft deactivate)
    removeMember: async (patientId: string, nutritionistId: string) => {
        return apiClient.delete<TeamMemberMutationResponse>(
            PatientReferralEndpoints.actions.removeMember(patientId, nutritionistId),
        );
    },

    // POST: Salir del equipo (self-remove)
    leaveTeam: async (patientId: string) => {
        return apiClient.post<TeamMemberMutationResponse>(
            PatientReferralEndpoints.actions.leaveTeam(patientId),
        );
    },
};