import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;
}
