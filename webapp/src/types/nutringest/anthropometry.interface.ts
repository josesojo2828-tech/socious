// Interfaces Simples (Para evitar dependencias circulares masivas)
export interface PatientSimple {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
}

export interface ConsultationSimple {
    id: string;
    scheduledAt: Date | string;
}

export interface Anthropometry {
    id: string;
    patientId: string;
    consultationId?: string | null;
    
    date: string | Date; // ISO String al venir de JSON

    // --- BÁSICOS ---
    weight: number;
    height: number;
    bmi?: number | null;
    sittingHeight?: number | null;
    usualWeight?: number | null;
    idealWeight?: number | null;
    adjustedWeight?: number | null;
    armSpan?: number | null;

    // --- CIRCUNFERENCIAS ---
    waist?: number | null;
    hip?: number | null;
    arm?: number | null;
    c_arm_relaxed?: number | null;
    c_arm_flexed?: number | null;
    c_wrist?: number | null;
    c_chest?: number | null;
    c_abdomen?: number | null;
    c_calf?: number | null;
    girthThighMid?: number | null;

    // --- PLIEGUES ---
    tricipital?: number | null;
    bicipital?: number | null;
    subscapular?: number | null;
    suprailiac?: number | null;
    skinfoldSupraspinale?: number | null;
    abdominal?: number | null;
    thigh?: number | null;
    calf?: number | null;

    // --- DIÁMETROS ---
    diameterHumeral?: number | null;
    diameterBiestiloid?: number | null;
    diameterFemoral?: number | null;

    // --- COMPOSICIÓN ---
    fatPercentage?: number | null;
    adiposeMass?: number | null;
    muscleMass?: number | null;
    visceralFat?: number | null;
    boneMass?: number | null;
    residualMass?: number | null;
    metabolicAge?: number | null;
    waterPercentage?: number | null;

    // --- ÍNDICES ---
    endomorphy?: number | null;
    mesomorphy?: number | null;
    ectomorphy?: number | null;
    conicityIndex?: number | null;
    cormicIndex?: number | null;
    manouvrierIndex?: number | null;
    heatLossIndex?: number | null;
    relativeArmSpan?: number | null;
    adiposeMuscleIndex?: number | null;
    muscleBoneIndex?: number | null;

    // --- RELACIONES ---
    patient?: PatientSimple;
    consultation?: ConsultationSimple | null;

    createdAt?: string | Date;
    updatedAt?: string | Date;
}
