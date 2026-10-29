import { ModuleScope } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

/**
 * Query for `GET /api/modules/:key/dashboard`.
 * `scope` defaults to the module's first declared scope; `userId` is only
 * meaningful for the `USER` scope.
 */
export class ModuleDashboardQueryDto {
  @IsOptional()
  @IsEnum(ModuleScope)
  scope?: ModuleScope;

  @IsOptional()
  @IsString()
  userId?: string;
}
