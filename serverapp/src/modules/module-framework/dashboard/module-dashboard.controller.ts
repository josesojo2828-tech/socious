import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ModuleScope } from "@prisma/client";
import type { RequestWithUser } from "src/shared/types/server.type";
import { isAdmin } from "src/modules/permit/authz";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { ModuleDashboardQueryDto } from "../dto/module-dashboard.dto";
import { ModuleFrameworkEnabledGuard } from "../guards/module-framework-enabled.guard";
import { ModuleService } from "../services/module.service";
import { ModuleDashboardRegistry } from "./module-dashboard.registry";

/**
 * `GET /api/modules/:key/dashboard?scope=&userId=` (task 2.6).
 *
 * Resolves the module catalog entry, validates the requested scope against the
 * module's declared scopes, applies the OPERATOR gate when `operatorPermit` is
 * set (full staff-role flow deferred), then delegates to the registered
 * provider. Unregistered module keys answer 404.
 *
 * Task 5.1: the whole controller is gated by `MODULE_FRAMEWORK_ENABLED`.
 * Phase 4 hardening: `scope=ADMIN` now requires a global admin role.
 */
@Controller("api/modules")
@UseGuards(ModuleFrameworkEnabledGuard)
export class ModuleDashboardController {
  constructor(
    private readonly modules: ModuleService,
    private readonly registry: ModuleDashboardRegistry,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get(":key/dashboard")
  async dashboard(
    @Param("key") key: string,
    @Query() query: ModuleDashboardQueryDto,
    @Req() req: RequestWithUser,
  ) {
    const module = await this.modules.findByKey(key);
    if (!module || !module.active) {
      throw new NotFoundException(`Módulo "${key}" no encontrado`);
    }

    const scope: ModuleScope = query.scope ?? module.scopes[0] ?? "TENANT";
    if (!module.scopes.includes(scope)) {
      throw new ForbiddenException(
        `El módulo "${key}" no expone el scope ${scope}`,
      );
    }

    // Phase 4 hardening — the ADMIN dashboard is platform-global; only global
    // admins (SUPERADMIN/ADMIN) may request it. Mirrors `isGlobalRole` in
    // `dashboard.controller.ts` via the shared `isAdmin` authz helper.
    if (scope === "ADMIN" && !isAdmin(req.user)) {
      throw new ForbiddenException(
        "El panel ADMIN de este módulo requiere rol SUPERADMIN o ADMIN",
      );
    }

    if (scope === "OPERATOR" && module.operatorPermit) {
      const userPermits = req.user?.permits;
      const allowed =
        userPermits?.name === module.operatorPermit ||
        (userPermits?.list ?? []).includes(module.operatorPermit);
      if (!allowed) {
        throw new ForbiddenException(
          "No autorizado para el panel OPERATOR de este módulo",
        );
      }
    }

    const provider = this.registry.get(key);
    if (!provider) {
      throw new NotFoundException(
        `El módulo "${key}" no tiene dashboard registrado`,
      );
    }

    const userId =
      scope === "USER" ? (query.userId ?? req.user?.id ?? null) : null;

    return provider.load({
      moduleKey: key,
      scope,
      userId,
      organizationId: this.workspaceContext.getWorkspaceId(),
    });
  }
}
