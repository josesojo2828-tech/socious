import { Prisma } from "@prisma/client";

// --- PRISMA TYPES ---
export type CONSULTATION_WHERE = Prisma.ConsultationWhereInput;
export type CONSULTATION_WHERE_UNIQUE = Prisma.ConsultationWhereUniqueInput;
export type CONSULTATION_CREATE = Prisma.ConsultationCreateInput;
export type CONSULTATION_UPDATE = Prisma.ConsultationUpdateInput;
export type CONSULTATION_WITH_ID = { id: string };
export type CONSULTATION_INCLUDE = Prisma.ConsultationInclude;
export type CONSULTATION_ORDER = Prisma.ConsultationOrderByWithRelationInput;

// --- DEFAULT INCLUDE ---
// Traemos al paciente para mostrar su nombre en la tabla
export const CONSULTATION_DEFAULT_INCLUDE: CONSULTATION_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: {
        select: {
          email: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  },
  anthropometry: true, // Si ya tiene mediciones asociadas
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

// --- FRONTEND / API DTOs ---

export interface ICreateConsultationDto {
  patientId?: string;
  scheduledAt: string | Date; // Puede venir como string ISO del frontend
  type: "FIRST_TIME" | "FOLLOW_UP" | "EMERGENCY";
  reason?: string;
}

export interface IUpdateConsultationDto {
  scheduledAt?: string | Date;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW" | "PENDING_APPROVAL";
  reason?: string;
  notes?: string; // Notas SOAP (Subjetivo, Objetivo, Análisis, Plan)
}

// --- SWAGGER RESPONSE TYPES ---

export interface ConsultationResponseDto {
  id: string;
  patientId?: string;
  nutritionistId: string;
  scheduledAt: Date;
  status: string;
  type: string;
  reason?: string;
  notes?: string;
  organizationId?: string | null;
  createdAt: Date;
}
