import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import type { RequestWithUser } from "src/shared/types/server.type";
import { UpsertFieldPolicyDto } from "./dto/field-policy.dto";
import { FieldPolicyService } from "./field-policy.service";

/**
 * Admin CRUD for role-based field policies (design D8). Field policies are
 * platform configuration (not org-scoped), so mutations require a global
 * SUPERADMIN/ADMIN. Reads are available to any authenticated caller.
 */
@Controller("api/field-policies")
export class FieldPolicyController {
  constructor(private readonly fieldPolicies: FieldPolicyService) {}

  @Get()
  list(
    @Query("moduleKey") moduleKey?: string,
    @Query("role") role?: OrganizationRole,
  ) {
    return this.fieldPolicies.list({ moduleKey, role });
  }

  @Post()
  upsert(@Body() dto: UpsertFieldPolicyDto, @Req() req: RequestWithUser) {
    this.assertGlobalAdmin(req);
    return this.fieldPolicies.upsert(dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    this.assertGlobalAdmin(req);
    return this.fieldPolicies.remove(id);
  }

  private assertGlobalAdmin(req: RequestWithUser): void {
    const name = req.user?.permits?.name;
    if (name === "SUPERADMIN" || name === "ADMIN") return;
    throw new ForbiddenException(
      "Solo administradores globales pueden gestionar políticas de campos",
    );
  }
}
