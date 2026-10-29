import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class CreateCalculatorUsageDto {
  @IsString()
  @IsIn(['pacientes', 'deportistas', 'pediatria'])
  calculatorType: string;

  @IsOptional()
  @IsObject()
  inputSnapshot?: Record<string, any>;

  @IsOptional()
  @IsObject()
  resultSnapshot?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'dashboard'])
  source?: string;
}