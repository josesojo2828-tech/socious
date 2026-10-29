import { IsInt, IsOptional, IsString, Min } from "class-validator";

/**
 * Enable a catalog add-on for an owner (organization or personal user).
 * `quantity` is reserved for quantity-based add-ons; phase 1 is flat per-owner.
 */
export class EnableEntitlementDto {
  @IsString()
  addOnId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
