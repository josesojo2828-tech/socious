import { Prisma, PortfolioEventType } from "@prisma/client";
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  Equals,
  MaxLength,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  ArrayMaxSize,
} from "class-validator";

export type PORTFOLIO_WHERE = Prisma.NutritionistWhereInput;
export type PORTFOLIO_CREATE = Prisma.NutritionistCreateInput;
export type PORTFOLIO_UPDATE = Prisma.NutritionistUpdateInput;
export type PORTFOLIO_WICTH_ID = { id: string };

export class TrackPortfolioEventDto {
  @IsEnum(PortfolioEventType || {})
  eventType: PortfolioEventType;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BookConsultationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // S6 (legal-compliance): el formulario público recolecta datos personales
  // y crea un Patient — se exige aceptación explícita del Aviso de Privacidad.
  @IsBoolean({
    message: "Debes aceptar el Aviso de Privacidad para solicitar la cita",
  })
  @Equals(true, {
    message: "Debes aceptar el Aviso de Privacidad para solicitar la cita",
  })
  acceptedPrivacyNotice: boolean;
}

export class PortfolioConfigDto {
  @IsString()
  @IsOptional()
  palette?: string;

  @IsBoolean()
  @IsOptional()
  showBio?: boolean;

  @IsBoolean()
  @IsOptional()
  showServices?: boolean;

  @IsBoolean()
  @IsOptional()
  showAccreditation?: boolean;

  @IsBoolean()
  @IsOptional()
  showPapers?: boolean;

  @IsBoolean()
  @IsOptional()
  showSocials?: boolean;

  @IsBoolean()
  @IsOptional()
  showWhatsappButton?: boolean;

  @IsBoolean()
  @IsOptional()
  showLocationMap?: boolean;

  @IsBoolean()
  @IsOptional()
  showBookingForm?: boolean;

  @IsArray()
  @IsOptional()
  widgets?: Array<{
    id: string;
    type: string;
    order: number;
    visible: boolean;
    content: Record<string, unknown>;
  }>;
}

export class UpdatePortfolioDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  about?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  services?: string[];

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @IsOptional()
  palette?: string;

  @IsBoolean()
  @IsOptional()
  showBio?: boolean;

  @IsBoolean()
  @IsOptional()
  showServices?: boolean;

  @IsBoolean()
  @IsOptional()
  showAccreditation?: boolean;

  @IsBoolean()
  @IsOptional()
  showPapers?: boolean;

  @IsBoolean()
  @IsOptional()
  showSocials?: boolean;

  @IsBoolean()
  @IsOptional()
  showWhatsappButton?: boolean;

  @IsBoolean()
  @IsOptional()
  showLocationMap?: boolean;

  @IsBoolean()
  @IsOptional()
  showBookingForm?: boolean;

  @IsObject()
  @IsOptional()
  config?: PortfolioConfigDto;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  // Accreditation & Legal Verification
  @IsString()
  @IsOptional()
  universityDegree?: string;

  @IsOptional()
  graduationYear?: number;

  @IsString()
  @IsOptional()
  mppsCode?: string;

  @IsString()
  @IsOptional()
  cndvCode?: string;

  @IsString()
  @IsOptional()
  cndvState?: string;

  @IsString()
  @IsOptional()
  identityCard?: string;

  @IsString()
  @IsOptional()
  degreeFileUrl?: string;

  @IsString()
  @IsOptional()
  licenseFileUrl?: string;
}

