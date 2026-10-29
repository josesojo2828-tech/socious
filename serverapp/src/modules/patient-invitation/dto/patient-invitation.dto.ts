import {
  IsNotEmpty,
  IsString,
} from "class-validator";
import { PasswordPolicy } from "./password-policy";

/**
 * S1 (patient-onboarding): DTOs de la invitación por correo.
 *
 * La política de contraseñas se reusa desde `ChangePasswordDto`
 * (`dto/password-policy.ts`): mínimo 8 caracteres, al menos una letra y al
 * menos un número.
 */

/** Payload del endpoint público que acepta la invitación. */
export class AcceptPatientInvitationDto {
  @IsString({ message: "El token debe ser un texto" })
  @IsNotEmpty({ message: "El token es requerido" })
  token: string;

  @PasswordPolicy()
  password: string;

  /**
   * La comparación con `password` NO se hace con `@Equals("password")`:
   * en class-validator 0.14 ese decorador compara contra la LITERAL
   * `"password"` (esa versión quitó la comparación contra otra propiedad), y
   * toda petición pasaba a responderse con 400 "Las contraseñas no coinciden".
   * La comparación real la hace el servicio, igual que `auth.service` con
   * `registerLocal`/`resetPassword`.
   */
  @PasswordPolicy()
  confirmPassword: string;
}

/** Payload del endpoint protegido que genera o reenvía la invitación. */
export class CreatePatientInvitationDto {
  @IsString({ message: "El identificador del paciente debe ser un texto" })
  @IsNotEmpty({ message: "El identificador del paciente es requerido" })
  patientId: string;

  /**
   * S1+S2 / C4: NO hay campo `email`. El destinatario se resuelve DESDE LA
   * BASE DE DATOS (el correo del representante si el paciente es menor, el del
   * paciente si no). Aceptarlo en el cuerpo de la petición permitiría a un
   * profesional redirigir la invitación a un tercero y quedarse con la
   * cuenta del paciente: por eso no existe, y el `ValidationPipe` global
   * (`whitelist` + `forbidNonWhitelisted`) rechaza cualquier propiedad extra.
   */
}
