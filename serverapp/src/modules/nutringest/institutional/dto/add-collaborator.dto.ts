import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { InstitutionalCollaboratorRole } from "@prisma/client";

export class AddCollaboratorDto {
  @IsString()
  @IsNotEmpty()
  nutritionistId: string;

  @IsEnum(InstitutionalCollaboratorRole)
  @IsOptional()
  role?: InstitutionalCollaboratorRole = InstitutionalCollaboratorRole.EDITOR;
}
