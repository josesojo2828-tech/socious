import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateSystemSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;
}
