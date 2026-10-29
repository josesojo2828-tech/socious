import { FieldAccess, OrganizationRole } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Create or update a role-based field policy. `access` defaults to `EDITABLE`
 * (visible); set `HIDDEN` to omit the field from the response for that role.
 */
export class UpsertFieldPolicyDto {
  @IsString()
  @IsNotEmpty()
  moduleKey: string;

  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @IsString()
  @IsNotEmpty()
  formKey: string;

  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @IsOptional()
  @IsEnum(FieldAccess)
  access?: FieldAccess;
}
