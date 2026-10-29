import {
  getMetadataStorage,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";
import { ChangePasswordDto } from "src/modules/auth/dto/change-password.dto";

/**
 * S1 (patient-onboarding): la política de contraseñas NO se re-declara aquí.
 *
 * La fuente de verdad es `ChangePasswordDto.newPassword` (mínimo 8
 * caracteres, al menos una letra y al menos un número). Este módulo lee los
 * metadatos de validación de ese DTO y los reutiliza, de modo que un cambio
 * en la política se propaga solo a la invitación del paciente.
 */

interface PasswordPolicyRule {
  /** Nombre de la regla original (minLength, matches, ...). */
  name: string;
  /** Restricciones originales de la regla. */
  constraints: unknown[];
  /** Mensaje original de la regla. */
  message: string;
  /** Valida un valor contra la regla original. */
  validate: (value: unknown) => boolean;
}

type ConstraintInstance = {
  validate(value: unknown, args: ValidationArguments): boolean;
  defaultMessage?(args: ValidationArguments): string;
};

function loadPasswordPolicyRules(): PasswordPolicyRule[] {
  const storage = getMetadataStorage();
  const metadatas = storage
    .getTargetValidationMetadatas(ChangePasswordDto, "newPassword", false, false)
    .filter((metadata) => metadata.propertyName === "newPassword");

  return metadatas.map((metadata) => {
    const ConstraintClass = metadata.constraintCls as new () => ConstraintInstance;
    const instance = new ConstraintClass();
    const args = {
      value: undefined,
      constraints: metadata.constraints,
      targetName: ChangePasswordDto.name,
      property: "newPassword",
    } as unknown as ValidationArguments;

    const message =
      typeof metadata.message === "string"
        ? metadata.message
        : (instance.defaultMessage?.(args) ??
          "La contraseña no cumple la política de seguridad");

    return {
      name: metadata.name ?? metadata.type,
      constraints: metadata.constraints,
      message,
      validate: (value: unknown) =>
        instance.validate(value, {
          ...args,
          value,
        } as unknown as ValidationArguments),
    };
  });
}

/** Reglas de la política de contraseñas reutilizadas de `ChangePasswordDto`. */
export const PASSWORD_POLICY_RULES: readonly PasswordPolicyRule[] =
  loadPasswordPolicyRules();

/**
 * Devuelve los mensajes de las reglas incumplidas (vacío cuando la
 * contraseña cumple la política). Se usa en la capa de servicio, donde no
 * existe el DTO validado por el pipe de Nest.
 */
export function validatePasswordPolicy(value: unknown): string[] {
  return PASSWORD_POLICY_RULES.filter((rule) => !rule.validate(value)).map(
    (rule) => rule.message,
  );
}

/**
 * Decorador que aplica la MISMA política que `ChangePasswordDto.newPassword`,
 * regla por regla, con los mensajes originales.
 */
export function PasswordPolicy(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    for (const rule of PASSWORD_POLICY_RULES) {
      registerDecorator({
        name: `passwordPolicy:${rule.name}`,
        target: object.constructor,
        propertyName: propertyName as string,
        options: { message: rule.message, ...validationOptions },
        constraints: rule.constraints,
        validator: {
          validate: (value: unknown) => rule.validate(value),
          defaultMessage: () => rule.message,
        },
      });
    }
  };
}
