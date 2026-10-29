// --- ENUMS (Espejo del backend Prisma) ---
// Valores string — coinciden exactamente con PatientReferralStatus / PatientNutritionistRole / PatientReferralType de Prisma.
export type PatientReferralStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
export type PatientNutritionistRole = 'PRIMARY' | 'SUPPORT';
export type ReferralType = 'TRANSFER' | 'COLLABORATOR';

// --- ENTIDADES ---

// Perfil de nutricionista dentro de un referido / equipo
// (espejo de NUTRITIONIST_SELECT del backend: id + licenseCode + specialty + user)
export interface ReferralNutritionist {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;

    // Perfil de usuario
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
    } | null;
}

// Paciente resumido dentro de un referido
// (espejo del select de patient en REFERRAL_DEFAULT_INCLUDE)
export interface ReferralPatient {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
}

// Referido entre nutricionistas (View del backend)
export interface PatientReferral {
    id: string;
    patientId: string;
    fromNutritionistId: string;
    toNutritionistId: string;
    type?: ReferralType;
    status: PatientReferralStatus;
    message?: string | null;
    responseMessage?: string | null;
    respondedById?: string | null;
    createdAt: string | Date; // ISO String al venir de JSON
    respondedAt?: string | Date | null;

    // Relaciones (profundas, del include)
    patient?: ReferralPatient | null;
    fromNutritionist?: ReferralNutritionist | null;
    toNutritionist?: ReferralNutritionist | null;
    respondedBy?: ReferralNutritionist | null;
}

// Miembro activo del equipo de cuidado de un paciente (pivote PatientNutritionist)
export interface PatientTeamMember {
    id: string;
    patientId: string;
    nutritionistId: string;
    role: PatientNutritionistRole;
    isActive: boolean;
    assignedById?: string | null;
    assignedAt: string | Date; // ISO String al venir de JSON

    // Relaciones (include TEAM_MEMBER_INCLUDE)
    nutritionist?: ReferralNutritionist | null;
    assignedBy?: ReferralNutritionist | null;
}

// --- DTOs (Payloads) ---

// POST /create/api
export interface CreateReferralPayload {
    patientId: string;
    toNutritionistId: string;
    message?: string;
}

// POST /:id/accept  |  /:id/reject
export interface RespondReferralPayload {
    responseMessage?: string;
}

// POST /team/:patientId/add
export interface AddCollaboratorPayload {
    nutritionistId: string;
    message?: string;
}

// POST /collaborator/:patientId (invitación por email, tipo COLLABORATOR)
export interface InviteCollaboratorPayload {
    email: string;
    message?: string;
}

// Resultado de GET /collaborator/search?email=... (solo nutricionistas PREMIUM/Clínica)
export interface CollaboratorSearchResult {
    id: string; // nutritionistProfile id
    email: string;
    fullName: string;
}

// PATCH /team/:patientId/:nutritionistId/role
export interface ChangeRolePayload {
    role: PatientNutritionistRole;
}

// --- RESPUESTAS ---

// Mutaciones que devuelven { message, entity }
export interface ReferralMutationResponse {
    message: string;
    entity: PatientReferral;
}

export interface TeamMemberMutationResponse {
    message: string;
    entity: PatientTeamMember;
}