import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

/**
 * S6 (legal-compliance): política de contraseñas única para cambio de
 * contraseña — mínimo 8 caracteres, al menos una letra y un dígito.
 * El mismo patrón aplica en RegisterAuthDto (login-auth.dto.ts).
 */
export class ChangePasswordDto {
  @IsString({ message: "La contraseña actual debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña actual es requerida" })
  oldPassword: string;

  @IsString({ message: "La nueva contraseña debe ser un texto" })
  @MinLength(8, {
    message: "La nueva contraseña debe tener al menos 8 caracteres",
  })
  @Matches(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/, {
    message: "La nueva contraseña debe contener al menos una letra",
  })
  @Matches(/\d/, {
    message: "La nueva contraseña debe contener al menos un número",
  })
  newPassword: string;
}
