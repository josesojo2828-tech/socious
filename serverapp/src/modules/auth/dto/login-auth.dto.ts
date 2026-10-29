import {
  IsBoolean,
  IsDateString,
  IsEmail,
  Equals,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsOptional,
} from "class-validator";

export class LoginAuthDto {
  @IsEmail({}, { message: "Formato de email inválido" })
  @IsNotEmpty({ message: "El email es requerido" })
  email: string;

  @IsString({ message: "La contraseña debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña es requerida" })
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  password: string;
}

export class RegisterAuthDto {
  @IsString({ message: "El nombre debe ser un texto" })
  @IsNotEmpty({ message: "El nombre es requerido" })
  firstName: string;

  @IsString({ message: "El apellido debe ser un texto" })
  @IsNotEmpty({ message: "El apellido es requerido" })
  lastName: string;

  @IsEmail({}, { message: "Formato de correo inválido" })
  @IsNotEmpty({ message: "El correo es requerido" })
  email: string;

  @IsString({ message: "La contraseña debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña es requerida" })
  // S6 (legal-compliance): política única — 8+ caracteres, letra y dígito.
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  @Matches(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/, {
    message: "La contraseña debe contener al menos una letra",
  })
  @Matches(/\d/, {
    message: "La contraseña debe contener al menos un número",
  })
  password: string;

  @IsString({ message: "La confirmación debe ser un texto" })
  @IsNotEmpty({ message: "La confirmación de la contraseña es requerida" })
  confirmPassword: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  // S7 (legal-compliance): gate de edad — requerido para el registro público.
  @IsDateString({}, { message: "Fecha de nacimiento inválida" })
  @IsNotEmpty({ message: "La fecha de nacimiento es requerida" })
  birthDate: string;

  // S1 (legal-compliance): prueba de consentimiento. Requerido en true:
  // sin aceptación explícita no se crea la cuenta.
  @IsBoolean({
    message: "Debes aceptar los Términos y la Política de Privacidad",
  })
  @Equals(true, {
    message: "Debes aceptar los Términos y la Política de Privacidad",
  })
  acceptedTerms: boolean;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Formato de correo inválido" })
  @IsNotEmpty({ message: "El correo es requerido" })
  email: string;
}

export class ResetPasswordDto {
  @IsString({ message: "El código debe ser un texto" })
  @IsNotEmpty({ message: "El código es requerido" })
  code: string;

  @IsString({ message: "La contraseña debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña es requerida" })
  // S6 (legal-compliance): misma política que el registro.
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  @Matches(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/, {
    message: "La contraseña debe contener al menos una letra",
  })
  @Matches(/\d/, {
    message: "La contraseña debe contener al menos un número",
  })
  password: string;

  @IsString({ message: "La confirmación debe ser un texto" })
  @IsNotEmpty({ message: "La confirmación de la contraseña es requerida" })
  confirmPassword: string;
}

export class VerifyEmailDto {
  @IsString({ message: "El token debe ser un texto" })
  @IsNotEmpty({ message: "El token es requerido" })
  token: string;
}
