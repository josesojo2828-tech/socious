import { PatientSimple } from "./anthropometry.interface"; // Reutilizamos

export interface LabResult {
    id: string;
    patientId: string;
    
    name: string;
    date: string | Date;
    fileUrl?: string | null;
    
    // Datos estructurados (Ej: { colesterol: 200 })
    data?: Record<string, any> | null;

    // --- RELACIONES ---
    patient?: PatientSimple;

    createdAt?: string | Date;
}