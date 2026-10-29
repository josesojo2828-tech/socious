import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePriorityLeadDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    priceRange?: string;

    @IsString()
    @IsOptional()
    featureRequest?: string;

    @IsOptional()
    wantsNotifications?: boolean;
}
