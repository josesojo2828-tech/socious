import { PartialType } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import {
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  MinLength,
  MaxLength,
  IsBoolean,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { AddressType, UserStatus } from "src/shared/types/schema.types";

export type USER_WHERE = Prisma.UserWhereInput;
export type USER_WHERE_UNIQUE = Prisma.UserWhereUniqueInput;
export type USER_CREATE = Prisma.UserCreateInput;
export type USER_UPDATE = Prisma.UserUpdateInput;
export type USER_WICTH_ID = { id: string };
export type USER_INCLUDE = Prisma.UserInclude;
export type USER_ORDER = Prisma.UserOrderByWithRelationInput;

export const DEFAULT_INCLUDE: USER_INCLUDE = {
  referredBy: true,
  wallet: true,
  subscriptions: {
    include: {
      plan: true,
      organization: true,
    },
    orderBy: {
      endDate: "desc",
    },
    skip: 0,
    take: 10,
  },
  File: {
    include: {
      userAsProfile: true,
    },
  },
  transactions: true,
  sessions: true,
  activityLogs: true,
  files: true,
  paymentMethods: true,
  permits: true,
  _count: {
    select: {
      transactions: true,
      paymentMethods: true,
      files: true,
      subscriptions: true,
      activityLogs: true,
      addresses: true,
      File: true,
      sessions: true,
      notifications: true,
      referrals: true,
    },
  },
  addresses: true,
  profile: {
    select: {
      name: true,
    },
  },
  nutritionistProfile: {
    include: {
      _count: {
        select: {
          consultations: true,
        },
      },
    },
  },
  patientProfiles: {
    include: {
      nutritionists: {
        include: {
          nutritionist: {
            include: {
              user: {
                select: { username: true },
              },
            },
          },
        },
      },
    },
  },
  userPermissions: true,
  organizationMembers: true,
};

export class CreateUserDto {
  @IsNotEmpty({ message: 'El firstName no puede estar vacío.' })
  @IsString({ message: 'El firstName debe ser una cadena de texto.' })
  @MinLength(3, { message: 'El firstName debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El firstName no puede exceder los 100 caracteres.' })
  firstName: string;

  @IsNotEmpty({ message: 'El apellido no puede estar vacío.' })
  @IsString({ message: 'El apellido debe ser una cadena de texto.' })
  @MinLength(3, { message: 'El apellido debe tener al menos 3 caracteres.' })
  @MaxLength(50, { message: 'El apellido no puede exceder los 50 caracteres.' })
  lastName: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsNotEmpty({ message: 'El email no puede estar vacío.' })
  @IsEmail({}, { message: 'Formato de email inválido.' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña no puede estar vacía.' })
  @IsString({ message: 'La confirmación debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres.' })
  passwordConfirm: string;

  @IsNotEmpty({ message: 'El status no puede estar vacío.' })
  @IsString({ message: 'El status debe ser una cadena de texto.' })
  status: string;

  @IsNotEmpty({ message: 'El permitId no puede estar vacío.' })
  @IsString({ message: 'El permitId debe ser una cadena de texto.' })
  permitId: string;

  @IsOptional()
  @IsString()
  referredByCode?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  // S7 (legal-compliance): gate de edad del registro público.
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  // S1 (legal-compliance): prueba de aceptación de Términos + Aviso de Privacidad.
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  termsAcceptedAt?: Date;

  @IsOptional()
  @IsString()
  termsVersion?: string;

  @IsOptional()
  @IsString()
  termsAcceptedIpHash?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  permitId?: string;
}

export class PasswordUserDto {
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña no puede estar vacía.' })
  @IsString({ message: 'La confirmación debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres.' })
  passwordConfirm: string;
}

export class CreateLocationDto {
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  lng: number;
}

export class CreateUserAddressDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsNotEmpty()
  @IsString()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @IsString()
  postalCode: string;

  // latitude: number;
  // longitude: number;

  @IsOptional()
  type?: AddressType;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateUserPaymentMethodDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  details?: any;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateSubscriptionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  /**
   * true = aplicar el cambio de plan sin descontar de la billetera del usuario
   * (lo usa el superadmin desde la ficha del usuario / UpdateUserSubscriptionModal).
   * El servicio ya lo soporta en IUserSubscriptionCreate; el DTO debe declararlo
   * porque el ValidationPipe global rechaza propiedades no whitelisted.
   */
  @IsOptional()
  @IsBoolean()
  ignorePayment?: boolean;
}
