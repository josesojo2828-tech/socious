import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class ReportPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  proofUrl?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
