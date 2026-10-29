// --- ENUMS (Deben coincidir con el backend) ---
export enum ConsultationStatus {
    PENDING_APPROVAL = 'PENDING_APPROVAL', // Pendiente de Aprobación
    SCHEDULED = 'SCHEDULED', // Agendada
    COMPLETED = 'COMPLETED', // Realizada
    CANCELED = 'CANCELED',   // Cancelada
    NO_SHOW = 'NO_SHOW'      // No asistió
}

export enum ConsultationType {
    FIRST_TIME = 'FIRST_TIME',
    FOLLOW_UP = 'FOLLOW_UP',
    EMERGENCY = 'EMERGENCY'
}

// --- SUB-INTERFACES ---
export interface PatientSimple {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    email?: string | null;
}

// --- ENTIDAD PRINCIPAL (Lo que devuelve el GET) ---
export interface Consultation {
    id: string;
    patientId: string;
    nutritionistId: string;

    scheduledAt: string; // ISO Date String
    status: ConsultationStatus;
    type: ConsultationType;

    reason?: string | null;
    notes?: string | null; // Notas SOAP

    // Relaciones pobladas (Include)
    patient?: PatientSimple;
    
    // IDs de snapshots vinculados
    anthropometryId?: string | null;
    planId?: string | null;

    createdAt: string;
    updatedAt?: string;
}

// --- DTOs PARA ACCIONES (Lo que enviamos en POST/PUT) ---

export interface CreateConsultationPayload {
    patientId: string;
    scheduledAt: string; // ISO String o Date object formateado
    type: ConsultationType;
    reason?: string;
}

export interface UpdateConsultationPayload {
    scheduledAt?: string;
    status?: ConsultationStatus;
    reason?: string;
    notes?: string;
}

// --- RESPUESTAS DE PAGINACIÓN ---
export interface ConsultationListResponse {
    list: Consultation[];
    total: number;
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasPrev: boolean;
    hasNext: boolean;
}

// --- RESPUESTAS DE MUTACIÓN (Create/Update) ---
export interface ConsultationActionResponse {
    message: string;
    entity: Consultation;
}