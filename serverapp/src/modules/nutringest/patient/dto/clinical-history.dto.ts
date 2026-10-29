import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsArray,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Sub-DTOs para los objetos JSON ---

export class FamilyHistoryDto {
  @IsOptional() diabetes?: any;
  @IsOptional() cancer?: any;
  @IsOptional() dislipidemia?: any;
  @IsOptional() anemia?: any;
  @IsOptional() hypertension?: any;
  @IsOptional() renalDiseases?: any;
  @IsOptional() @IsString() @MaxLength(500) others?: string;
  @IsOptional() @IsString() @MaxLength(500) currentMedications?: string;
}

export class PersonalHistoryDto {
  @IsOptional() @IsBoolean() diabetes?: boolean;
  @IsOptional() @IsBoolean() hypertension?: boolean;
  @IsOptional() @IsBoolean() cancer?: boolean;
  @IsOptional() @IsBoolean() obesity?: boolean;
  @IsOptional() @IsBoolean() dislipidemia?: boolean;
  @IsOptional() @IsBoolean() renalDiseases?: boolean;
  @IsOptional() @IsBoolean() anemia?: boolean;
  @IsOptional() @IsString() @MaxLength(500) surgeries?: string;
  @IsOptional() @IsString() @MaxLength(500) others?: string;
  @IsOptional() @IsString() @MaxLength(500) currentMedications?: string;
  @IsOptional() anxiety?: any;
  @IsOptional() stress?: any;
  @IsOptional() depression?: any;
}

export class GynecoObstetricDto {
  @IsOptional() @IsInt() @Min(0) g?: number;
  @IsOptional() @IsInt() @Min(0) p?: number;
  @IsOptional() @IsInt() @Min(0) c?: number;
  @IsOptional() @IsString() @MaxLength(100) fum?: string;
  @IsOptional() @IsString() @MaxLength(100) fupc?: string;
  @IsOptional() @IsString() @MaxLength(100) sdg?: string;
  @IsOptional() @IsString() @MaxLength(100) ppg?: string;
  @IsOptional() @IsString() @MaxLength(200) contraceptives?: string;
}

export class GISymptomDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(100) frequency?: string;
}

export class GastrointestinalDisordersDto {
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) vomiting?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) diarrhea?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) constipation?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) colitis?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) gastritis?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) nausea?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) reflux?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) dysphagia?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) flatulence?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) distension?: GISymptomDto;
  @IsOptional() @ValidateNested() @Type(() => GISymptomDto) pyrosis?: GISymptomDto;
}

export class EatingHabitsDto {
  @IsOptional() @IsString() @MaxLength(200) eatingCompanion?: string;
  @IsOptional() @IsString() @MaxLength(200) foodPreparer?: string;
  @IsOptional() @IsInt() @Min(1) @Max(10) mealsPerDay?: number;
  @IsOptional() @IsBoolean() snacks?: boolean;
  @IsOptional() @IsString() @MaxLength(300) snackFoods?: string;
  @IsOptional() @IsString() @MaxLength(200) mealSchedule?: string;
  @IsOptional() @IsInt() @Min(0) mealsAtHome?: number;
  @IsOptional() @IsInt() @Min(0) mealsOut?: number;
  @IsOptional() @IsInt() @Min(0) weekendMealsOut?: number;
  @IsOptional() @IsString() @MaxLength(100) peakAppetiteTime?: string;
  @IsOptional() @IsString() @MaxLength(300) appetiteConsideration?: string;
  @IsOptional() @IsString() @MaxLength(300) appetiteChanges?: string;
}

export class Recall24hDto {
  @IsOptional() @IsString() @MaxLength(500) breakfast?: string;
  @IsOptional() @IsString() @MaxLength(500) morningSnack?: string;
  @IsOptional() @IsString() @MaxLength(500) lunch?: string;
  @IsOptional() @IsString() @MaxLength(500) afternoonSnack?: string;
  @IsOptional() @IsString() @MaxLength(500) dinner?: string;
}

// --- DTO Principal ---

export class UpdateClinicalHistoryDto {
  // --- Datos Personales (Patient) ---
  @IsOptional() @IsString() @MaxLength(100) maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(200) occupation?: string;

  // --- Antecedentes Heredofamiliares ---
  @IsOptional() @ValidateNested() @Type(() => FamilyHistoryDto) familyHistory?: FamilyHistoryDto;

  // --- Antecedentes Personales Patológicos ---
  @IsOptional() @ValidateNested() @Type(() => PersonalHistoryDto) personalHistory?: PersonalHistoryDto;

  // --- Antecedentes No Patológicos ---
  @IsOptional() @IsString() @MaxLength(300) physicalActivity?: string;
  @IsOptional() @IsString() @MaxLength(200) exerciseFrequency?: string;
  @IsOptional() @IsInt() @Min(0) @Max(24) sleepHours?: number;
  @IsOptional() @IsBoolean() smoking?: boolean;
  @IsOptional() @IsString() @MaxLength(200) smokingFrequency?: string;
  @IsOptional() @IsString() @MaxLength(200) alcohol?: string;
  @IsOptional() @IsString() @MaxLength(200) alcoholFrequency?: string;

  // --- Antecedentes Gineco-obstétricos ---
  @IsOptional() @ValidateNested() @Type(() => GynecoObstetricDto) gynecoObstetric?: GynecoObstetricDto;

  // --- Trastornos Gastrointestinales ---
  @IsOptional() @ValidateNested() @Type(() => GastrointestinalDisordersDto) gastrointestinalDisorders?: GastrointestinalDisordersDto;

  // --- Hábitos de Alimentación ---
  @IsOptional() @ValidateNested() @Type(() => EatingHabitsDto) eatingHabits?: EatingHabitsDto;

  // --- Frecuencia de Consumo ---
  @IsOptional() @IsObject() foodFrequency?: Record<string, string>;

  // --- Recordatorio 24h ---
  @IsOptional() @ValidateNested() @Type(() => Recall24hDto) recall24h?: Recall24hDto;

  // --- Alergias, Intolerancias, Preferencias ---
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) intolerances?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) dislikes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preferredFoods?: string[];

  // --- Dietas y Suplementos ---
  @IsOptional() @IsString() @MaxLength(1000) previousDiets?: string;
  @IsOptional() @IsString() @MaxLength(500) weightLossMeds?: string;
  @IsOptional() @IsString() @MaxLength(500) supplements?: string;

  // --- Diagnóstico Nutricional ---
  @IsOptional() @IsString() @MaxLength(2000) nutritionalDiagnosis?: string;
}
