import { IsEmail, IsNotEmpty, IsString, IsUUID, IsOptional } from "class-validator";

export class CreateRequestDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsUUID()
  universityId: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsNotEmpty()
  @IsString()
  graduationDate: string;
}
