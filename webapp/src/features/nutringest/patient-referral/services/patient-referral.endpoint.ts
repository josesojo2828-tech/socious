const API_BASE = '/api/nutringest/patient-referral';

export const PatientReferralEndpoints = {
    actions: {
        // GET: Referidos entrantes (hacia el nutricionista logueado) ?status=PENDING
        incoming: (queryParams: string = '') => `${API_BASE}/incoming${queryParams ? `?${queryParams}` : ''}`,

        // GET: Referidos salientes (desde el nutricionista logueado) ?status=PENDING
        outgoing: (queryParams: string = '') => `${API_BASE}/outgoing${queryParams ? `?${queryParams}` : ''}`,

        // GET: Detalle de un referido (solo participantes)
        detail: (id: string) => `${API_BASE}/${id}`,

        // POST: Solicitar referido
        create: () => `${API_BASE}/create/api`,

        // POST: Aceptar referido (destinatario)
        accept: (id: string) => `${API_BASE}/${id}/accept`,

        // POST: Rechazar referido (destinatario)
        reject: (id: string) => `${API_BASE}/${id}/reject`,

        // POST: Cancelar referido (remitente)
        cancel: (id: string) => `${API_BASE}/${id}/cancel`,

        // GET: Equipo de cuidado activo de un paciente
        team: (patientId: string) => `${API_BASE}/team/${patientId}`,

        // GET: Historial de referidos de un paciente (todos los estados, solo equipo activo)
        history: (patientId: string) => `${API_BASE}/patient/${patientId}/history`,

        // GET: Buscar nutricionistas colaboradores por email (solo plan PREMIUM/Clínica, excluye al solicitante)
        searchCollaborators: (email: string) => `${API_BASE}/collaborator/search?email=${encodeURIComponent(email)}`,

        // POST: Invitar colaborador por email (crea PatientReferral tipo COLLABORATOR pendiente de aceptación)
        inviteCollaborator: (patientId: string) => `${API_BASE}/collaborator/${patientId}`,

        // POST: Agregar colaborador directo al equipo (SUPPORT, sin flujo de referido)
        addCollaborator: (patientId: string) => `${API_BASE}/team/${patientId}/add`,

        // PATCH: Cambiar rol de un miembro del equipo
        changeRole: (patientId: string, nutritionistId: string) => `${API_BASE}/team/${patientId}/${nutritionistId}/role`,

        // DELETE: Remover un miembro del equipo (soft deactivate)
        removeMember: (patientId: string, nutritionistId: string) => `${API_BASE}/team/${patientId}/${nutritionistId}`,

        // POST: Salir del equipo (self-remove)
        leaveTeam: (patientId: string) => `${API_BASE}/team/${patientId}/leave`,
    },
};