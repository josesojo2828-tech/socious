import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignPlanDto } from './create-campaign-plan.dto';

export class UpdateCampaignPlanDto extends PartialType(CreateCampaignPlanDto) {}
