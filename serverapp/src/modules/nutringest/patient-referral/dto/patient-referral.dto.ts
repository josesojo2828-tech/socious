import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Prisma,
  PatientNutritionistRole,
  PatientReferralStatus,
  ReferralType,
} from "@prisma/client";

// --- PRISMA TYPES ---
export type REFERRAL_WHERE = Prisma.PatientReferralWhereInput;
export type REFERRAL_WHERE_UNIQUE = Prisma.PatientReferralWhereUniqueInput;
export type REFERRAL_CREATE = Prisma.PatientReferralCreateInput;
export type REFERRAL_UPDATE = Prisma.PatientReferralUpdateInput;
export type REFERRAL_INCLUDE = Prisma.PatientReferralInclude;
export type REFERRAL_ORDER = Prisma.PatientReferralOrderByWithRelationInput;
export type REFERRAL_WITH_ID = { id: string };

// --- PRISMA TYPES (TEAM / MEMBRESÍAS) ---
export type MEMBERSHIP_WHERE = Prisma.PatientNutritionistWhereInput;
export type MEMBERSHIP_INCLUDE = Prisma.PatientNutritionistInclude;

// --- RELACIÓN NUTRICIONISTA (nombre + perfil) ---
export const NUTRITIONIST_SELECT = {
  select: {
    id: true,
    licenseCode: true,
    specialty: true,
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
      },
    },
  },
};

// --- DEFAULT INCLUDE ---
// Traemos paciente y nutricionistas (origen/destino/responsable) con su nombre
export const REFERRAL_DEFAULT_INCLUDE: REFERRAL_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  fromNutritionist: NUTRITIONIST_SELECT,
  toNutritionist: NUTRITIONIST_SELECT,
  respondedBy: NUTRITIONIST_SELECT,
};

// --- TEAM / MEMBRESÍA (include por defecto del pivote PatientNutritionist) ---
// NUTRITIONIST_SELECT ya es un objeto Args ({ select: {...} }), se usa directo.
export const TEAM_MEMBER_INCLUDE: MEMBERSHIP_INCLUDE = {
  nutritionist: NUTRITIONIST_SELECT,
  assignedBy: NUTRITIONIST_SELECT,
};

// --- FRONTEND / API VIEW (mapper del repositorio) ---
export interface PatientReferralView {
  id: string;
  patientId: string;
  fromNutritionistId: string;
  toNutritionistId: string;
  status: PatientReferralStatus;
  type: ReferralType;
  message?: string | null;
  responseMessage?: string | null;
  respondedById?: string | null;
  createdAt: Date;
  respondedAt?: Date | null;

  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
  } | null;
  fromNutritionist?: {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
    } | null;
  } | null;
  toNutritionist?: {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
    } | null;
  } | null;
  respondedBy?: {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
    } | null;
  } | null;
}

// --- FRONTEND / API VIEW (membresía activa del equipo) ---
export interface PatientTeamMember {
  id: string;
  patientId: string;
  nutritionistId: string;
  role: PatientNutritionistRole;
  isActive: boolean;
  assignedById?: string | null;
  assignedAt: Date;

  nutritionist?: {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
    } | null;
  } | null;
  assignedBy?: {
    id: string;
    licenseCode?: string | null;
    specialty?: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
    } | null;
  } | null;
}

// =========================================================
// DTOs
// =========================================================

// POST /api/nutringest/patient-referral/create/api
export class CreateReferralDto {
  @ApiProperty({ description: "ID del paciente a referir", example: "uuid-patient" })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: "ID del nutricionista destinatario",
    example: "uuid-nutritionist",
  })
  @IsUUID()
  @IsNotEmpty()
  toNutritionistId: string;

  @ApiPropertyOptional({
    description:
      "Tipo de referido: TRANSFER (el destinatario pasa a PRIMARY) o COLLABORATOR (se une como SUPPORT)",
    enum: ReferralType,
    default: ReferralType.TRANSFER,
  })
  @IsOptional()
  @IsEnum(ReferralType)
  type?: ReferralType;

  @ApiPropertyOptional({
    description: "Mensaje opcional de contexto del referido",
  })
  @IsOptional()
  @IsString()
  message?: string;
}

// POST /api/nutringest/patient-referral/collaborator/:patientId
// Invitación por EMAIL a un nutricionista PREMIUM para colaborar (SUPPORT).
export class InviteCollaboratorDto {
  @ApiProperty({
    description: "Email del nutricionista PREMIUM a invitar como colaborador",
    example: "colega@nutringest.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: "Mensaje opcional de contexto de la invitación",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

// POST /api/nutringest/patient-referral/:id/accept
// POST /api/nutringest/patient-referral/:id/reject
export class RespondReferralDto {
  @ApiPropertyOptional({
    description: "Mensaje de respuesta (aceptación o rechazo)",
  })
  @IsOptional()
  @IsString()
  responseMessage?: string;
}

// POST /api/nutringest/patient-referral/team/:patientId/add
// Alta directa de un colaborador SUPPORT al equipo de cuidado (no genera referido)
export class AddCollaboratorDto {
  @ApiProperty({
    description: "ID del nutricionista a agregar como colaborador",
    example: "uuid-nutritionist",
  })
  @IsUUID()
  @IsNotEmpty()
  nutritionistId: string;

  @ApiPropertyOptional({
    description: "Mensaje opcional de contexto de la incorporación",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

// PATCH /api/nutringest/patient-referral/team/:patientId/:nutritionistId/role
export class ChangeRoleDto {
  @ApiProperty({
    description: "Nuevo rol del miembro del equipo",
    enum: PatientNutritionistRole,
    example: PatientNutritionistRole.SUPPORT,
  })
  @IsEnum(PatientNutritionistRole)
  @IsNotEmpty()
  role: PatientNutritionistRole;
}