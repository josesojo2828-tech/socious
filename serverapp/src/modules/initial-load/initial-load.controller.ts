import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { FastifyReply } from "fastify";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ImportInitialLoadDto } from "./initial-load.dto";
import {
  InitialLoadService,
  type InitialLoadScope,
} from "./initial-load.service";

/**
 * Initial accounts-receivable load (S3/S5). Both writes require a resolved
 * organization: the personal context is rejected so a merchant never imports
 * documents that later disappear from the business.
 */
@Controller("api/initial-load")
@UseGuards(SessionAuthGuard)
export class InitialLoadController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly initialLoadService: InitialLoadService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<InitialLoadScope> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    if (!resolved.organizationId) {
      throw new BadRequestException(
        "Selecciona un espacio de negocio para cargar datos iniciales.",
      );
    }

    return {
      organizationId: resolved.organizationId,
      createdById: request.user.id,
    };
  }

  /** CSV template with the documented header and two example rows. */
  @Get("template")
  template(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      'attachment; filename="plantilla-cuentas-por-cobrar.csv"',
    );
    return this.initialLoadService.template();
  }

  /** Dry-run: parses and resolves, writes nothing. */
  @Post("validate")
  async validate(
    @Req() request: RequestWithUser,
    @Body() body: ImportInitialLoadDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.initialLoadService.validate(scope, body);
  }

  /** Commit: creates clients, products and unpaid historical sales. */
  @Post("commit")
  async commit(
    @Req() request: RequestWithUser,
    @Body() body: ImportInitialLoadDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.initialLoadService.commit(scope, body);
  }
}
