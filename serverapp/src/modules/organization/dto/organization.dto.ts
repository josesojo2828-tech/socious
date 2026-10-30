import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

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

  /** Public storefront handle (`socius.com/shop/[slug]`). Auto-derived. */
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "El slug solo puede contener minúsculas, números y guiones.",
  })
  @MaxLength(80, { message: "El slug no puede exceder 80 caracteres." })
  slug?: string;

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
