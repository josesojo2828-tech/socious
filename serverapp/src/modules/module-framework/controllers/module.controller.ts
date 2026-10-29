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
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { RequestWithUser } from "src/shared/types/server.type";
import {
  AssignModuleGrantDto,
  ListModuleGrantsQueryDto,
} from "../dto/module-grant.dto";
import { ModuleFrameworkEnabledGuard } from "../guards/module-framework-enabled.guard";
import { ModuleGrantService } from "../services/module-grant.service";
import { ModuleService } from "../services/module.service";

/**
 * Module catalog + grant management (task 2.4).
 *
 * Authentication is global (`SessionAuthGuard` APP_GUARD). Grant mutations
 * require a global admin (SUPERADMIN/ADMIN) or the CLINIC_ADMIN of the target
 * organization; the finer-grained staff/OPERATOR role flow is deferred.
 *
 * Task 5.1: the whole controller is gated by `MODULE_FRAMEWORK_ENABLED`.
 */
@Controller("api/modules")
@UseGuards(ModuleFrameworkEnabledGuard)
export class ModuleController {
  constructor(
    private readonly modules: ModuleService,
    private readonly grants: ModuleGrantService,
    private readonly prisma: PrismaService,
  ) {}

  /** Active module catalog. */
  @Get()
  list() {
    return this.modules.list();
  }

  /** Grants filtered by owner (`?userId` or `?organizationId`). */
  @Get("grants")
  listGrants(@Query() query: ListModuleGrantsQueryDto) {
    return this.grants.list(query);
  }

  /** Assign (or reactivate) a MANUAL grant for an owner. */
  @Post("grants")
  async assign(
    @Body() dto: AssignModuleGrantDto,
    @Req() req: RequestWithUser,
  ) {
    await this.assertCanManage(req, dto.organizationId ?? null);
    return this.grants.assign(dto, req.user?.id);
  }

  /** Revoke a grant (`status=REVOKED`). */
  @Delete("grants/:id")
  async revoke(@Param("id") id: string, @Req() req: RequestWithUser) {
    const grant = await this.grants.findOne(id);
    await this.assertCanManage(req, grant.organizationId ?? null);
    return this.grants.revoke(id);
  }

  private async assertCanManage(
    req: RequestWithUser,
    organizationId: string | null,
  ): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException("No autenticado");
    }

    const role = user.permits?.name;
    if (role === "SUPERADMIN" || role === "ADMIN") return;

    if (organizationId) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: user.id },
        },
      });
      if (membership?.status === "ACTIVE" && membership.role === "CLINIC_ADMIN") {
        return;
      }
    }

    throw new ForbiddenException(
      "No tienes permisos para administrar módulos",
    );
  }
}
