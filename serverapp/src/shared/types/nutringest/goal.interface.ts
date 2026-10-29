import { PatientSimple } from "./anthropometry.interface";

// Mismo Enum que en Prisma, pero definido en TS puro
export enum GoalType {
  WEIGHT = "WEIGHT",
  MEASUREMENT = "MEASUREMENT",
  HABIT = "HABIT",
  OTHER = "OTHER",
}

export interface Goal {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  title: string;
  type: GoalType;

  startValue?: number | null;
  targetValue?: number | null;
  currentValue?: number | null;
  description?: string | null;

  deadline?: string | Date | null;
  isAchieved: boolean;

  // --- RELACIONES ---
  patient?: PatientSimple;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}
