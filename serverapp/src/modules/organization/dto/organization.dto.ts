import { IsString, IsOptional, IsInt, Min, IsEnum, IsBoolean } from 'class-validator';

export enum OrganizationRoleDto {
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  CLINIC_MANAGER = 'CLINIC_MANAGER',
  NUTRITIONIST = 'NUTRITIONIST',
  RECEPTIONIST = 'RECEPTIONIST',
}

export class CreateWorkspaceSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsBoolean()
  ignorePayment?: boolean;
}

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSeats?: number;
}

export class InviteMemberDto {
  @IsString()
  email: string;

  @IsEnum(OrganizationRoleDto)
  role: OrganizationRoleDto;

  @IsOptional()
  @IsString()
  colorHex?: string;
}

export class UpdateMemberColorDto {
  @IsString()
  colorHex: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationRoleDto)
  role: OrganizationRoleDto;
}

export class PurchaseSeatsDto {
  @IsInt()
  @Min(1)
  additionalSeats: number;
}

export class UpdateSeatsDto {
  @IsInt()
  @Min(1)
  maxSeats: number;
}
