import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidationArguments,
  ValidationOptions,
  isURL,
  registerDecorator,
} from "class-validator";

/**
 * Cross-field rule for `PATCH /api/organizations/identity`: a single
 * coordinate cannot be placed on a map, so latitude and longitude travel
 * together or not at all.
 *
 * Both coordinates must share the same "shape" so that clearing cannot be
 * confused with setting:
 *   - both omitted (`undefined`) → leave the pair untouched
 *   - both `null`               → clear the pair
 *   - both numbers              → set the pair
 *   - one retained/one omitted, or a number paired with `null` → invalid
 *
 * The decorator runs on both properties without a `ValidateIf`, so a lone
 * `null` on either side is still caught while both-absent stays valid.
 */
export function IsCoordinatePair(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCoordinatePair",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as {
            latitude?: number | null;
            longitude?: number | null;
          };
          const hasLatitude = dto.latitude !== undefined;
          const hasLongitude = dto.longitude !== undefined;

          // Omitted together: partial payload that leaves the pair untouched.
          if (!hasLatitude && !hasLongitude) return true;
          // One without the other: cannot place a single coordinate.
          if (hasLatitude !== hasLongitude) return false;

          // Both present: they must be cleared together or set together.
          return (dto.latitude === null) === (dto.longitude === null);
        },
        defaultMessage() {
          return "La latitud y la longitud deben enviarse juntas.";
        },
      },
    });
  };
}

/**
 * Numeric coordinate validator that tolerates an explicit `null` (clear) and
 * an omitted value; the pair rule decides whether either is valid. A present
 * number must fall inside `[min, max]`.
 */
export function IsCoordinateRange(min: number, max: number, label: string) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCoordinateRange",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined) return true;
          if (typeof value !== "number" || Number.isNaN(value)) return false;
          return value >= min && value <= max;
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value;
          if (typeof value !== "number" || Number.isNaN(value)) {
            return `${label} debe ser numérica.`;
          }
          return `${label} debe estar entre ${min} y ${max}.`;
        },
      },
    });
  };
}

/**
 * The tenant logo is stored either as a public http(s) URL or as a
 * root-relative path (`/images/logo.png`) served by the frontend.
 */
export function IsLogoUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isLogoUrl",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== "string") return false;
          if (value.startsWith("/")) return true;
          return isURL(value, {
            protocols: ["http", "https"],
            require_protocol: true,
          });
        },
        defaultMessage() {
          return "El logo debe ser una URL http(s) o una ruta que empiece con /.";
        },
      },
    });
  };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Partial body for `PATCH /api/organizations/identity`.
 *
 * Every field is optional so the client can save one section at a time; the
 * service writes only the keys that are present, never turning omitted
 * identity fields into `null`.
 */
export class UpdateOrganizationIdentityDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsString({ message: "El nombre debe ser texto." })
  @IsNotEmpty({ message: "El nombre no puede estar vacío." })
  @MaxLength(120, { message: "El nombre no puede exceder 120 caracteres." })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "El correo no es válido." })
  @MaxLength(160, { message: "El correo no puede exceder 160 caracteres." })
  email?: string | null;

  @IsOptional()
  @IsString({ message: "El teléfono debe ser texto." })
  @MaxLength(40, { message: "El teléfono no puede exceder 40 caracteres." })
  phone?: string | null;

  @IsOptional()
  @IsUrl(
    { protocols: ["http", "https"], require_protocol: true },
    { message: "El sitio web debe ser una URL http(s) válida." },
  )
  @MaxLength(200, {
    message: "El sitio web no puede exceder 200 caracteres.",
  })
  website?: string | null;

  @IsOptional()
  @IsString({ message: "La dirección debe ser texto." })
  @MaxLength(300, { message: "La dirección no puede exceder 300 caracteres." })
  address?: string | null;

  @IsCoordinatePair()
  @IsCoordinateRange(-90, 90, "La latitud")
  latitude?: number | null;

  @IsCoordinatePair()
  @IsCoordinateRange(-180, 180, "La longitud")
  longitude?: number | null;

  /**
   * Brand colors keep a valid hex or are omitted; `null` is NOT a way to drop
   * them, so a tenant never ends up with an undefined theme token.
   */
  @ValidateIf((_dto, value) => value !== undefined)
  @Matches(HEX_COLOR, {
    message: "El color debe tener el formato hexadecimal #RRGGBB.",
  })
  brandPrimary?: string;

  @ValidateIf((_dto, value) => value !== undefined)
  @Matches(HEX_COLOR, {
    message: "El color debe tener el formato hexadecimal #RRGGBB.",
  })
  brandAccent?: string;

  @IsOptional()
  @IsLogoUrl()
  @MaxLength(500, { message: "El logo no puede exceder 500 caracteres." })
  logoUrl?: string | null;
}
