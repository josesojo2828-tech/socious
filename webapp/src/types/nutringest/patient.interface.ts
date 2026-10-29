
// --- ENUMS (Espejo del backend) ---
// Si no quieres importar de prisma, descomenta esto:
/*
export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}
export enum ActivityLevel {
    SEDENTARY = 'SEDENTARY',
    LIGHTLY_ACTIVE = 'LIGHTLY_ACTIVE',
    MODERATELY_ACTIVE = 'MODERATELY_ACTIVE',
    VERY_ACTIVE = 'VERY_ACTIVE',
    EXTRA_ACTIVE = 'EXTRA_ACTIVE'
}
*/

// --- ENTIDADES ---

// Resumen para la tabla (Listado)
export interface PatientSummary {
    id: string; // ID del User o del Patient (según tu estrategia, aquí parece ser User ID con perfil anidado)
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    gender: any;
    birthDate: string; // ISO Date
    avatarUrl?: string;
    
    // Datos calculados o anidados
    age?: number; 
    status: 'ACTIVE' | 'INACTIVE';

    // Membresías activas del paciente (pivote M:N con nutricionistas)
    nutritionists?: { nutritionistId: string; isActive: boolean; role?: string }[];
    
    // Estadísticas rápidas (si el backend las envía)
    _count?: {
        consultations: number;
        plans: number;
    };
}

// Detalle Completo (Expediente)
export interface PatientDetail extends PatientSummary {
    nutritionistId: string;
    userId?: string;
    occupation?: string;
    activityLevel?: any;
    address?: string;
    maritalStatus?: string;
    medicalHistory?: any;

    // Clinical data
    anamnesis?: {
        allergies?: string[];
        intolerances?: string[];
        physicalActivity?: string;
        smoking?: boolean;
        alcohol?: string;
        sleepHours?: number;
        sportsAnamnesis?: {
            sweatRate?: number;
            sport?: string;
            phase?: string;
            discipline?: string;
        };
        pediatricAnamnesis?: {
            phvStatus?: string;
            feedingType?: string;
        };
    };
    anthropometrics?: any[];
    consultations?: any[];
    goals?: any[];
    plans?: any[];
    labResults?: any[];
    nutritionists?: { nutritionistId: string; isActive: boolean; role?: string; nutritionist?: any }[];

    createdAt: string;
    updatedAt: string;
}

// --- DTOs (Payloads) ---

export interface CreatePatientPayload {
    // Datos de Cuenta (User)
    email: string;
    username?: string;
    password?: string; // Opcional si generas una por defecto
    
    // Datos Personales
    firstName: string;
    lastName: string;
    phone?: string;
    birthDate: string; // YYYY-MM-DD
    gender: any;

    // S5 legal-compliance: el paciente debe haber aceptado el Aviso de Privacidad
    privacyNoticeAccepted: boolean;
}

export interface UpdatePatientPayload {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gender?: any;
    birthDate?: string;
    occupation?: string;
    activityLevel?: any;
}

// --- RESPUESTAS ---

export interface PatientListResponse {
    list: PatientSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}