import { Transform } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { FilterParamsDto } from "src/shared/types/server.type";

/**
 * Filtros específicos del listado administrativo de usuarios.
 * Extiende el DTO compartido para no romper los demás listados.
 */
export class UserListQueryDto extends FilterParamsDto {
  // Filtro por estado del usuario (User.status). Se valida acá porque el
  // campo `status` es compartido por otros listados con enums distintos.
  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED", "DELETED"])
  status?: string = undefined;

  // Filtro multi-selección por rol/tipo de usuario (Permit.name).
  // Acepta params repetidos (?permitName=A&permitName=B) o separados por coma
  // (?permitName=A,B).
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    const raw = Array.isArray(value) ? value : String(value).split(",");
    const parsed = raw.map((item) => String(item).trim()).filter(Boolean);
    return parsed.length ? parsed : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  permitName?: string[];

  // Filtro por correo verificado (User.emailVerifiedAt).
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : value === "true" || value === true,
  )
  emailVerified?: boolean;
}
