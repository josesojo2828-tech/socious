import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";

import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import { InvoiceService } from "./invoice.service";
import { BillingHistoryQueryDto } from "./dto/billing-history.dto";

/**
 * Monthly billing history API.
 *
 * Authentication is provided by the global `SessionAuthGuard` (`APP_GUARD` in
 * `AuthModule`), so no per-controller guard is needed — adding one here would
 * require re-providing `JwtService`/`UserService` and create a cycle with
 * `UserModule` (which imports this module). Owner access is additionally
 * enforced in-handler (organization membership, or self for personal invoices)
 * so a tenant can never read another owner's billing history.
 */
@Controller("api/billing")
export class BillingController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get("invoices")
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    }),
  )
  async listInvoices(
    @Req() req: RequestWithUser,
    @Query() query: BillingHistoryQueryDto,
  ) {
    const owner = await this.resolveOwner(req, query);

    return this.invoiceService.listInvoices({
      ...owner,
      period: query.period,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get("invoices/:id")
  async getInvoice(@Req() req: RequestWithUser, @Param("id") id: string) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    if (invoice.organizationId) {
      await this.assertOrganizationAccess(req, invoice.organizationId);
    } else if (invoice.userId) {
      this.assertPersonalAccess(req, invoice.userId);
    }

    return invoice;
  }

  /**
   * Resolves the owner scope for a history query and enforces read access:
   * explicit owner wins; otherwise the workspace org, otherwise the caller's
   * personal invoices.
   */
  private async resolveOwner(
    req: RequestWithUser,
    query: BillingHistoryQueryDto,
  ): Promise<{ organizationId?: string; userId?: string }> {
    if (query.ownerType === "organization") {
      if (!query.ownerId) {
        throw new BadRequestException(
          "ownerId es requerido cuando ownerType=organization",
        );
      }
      await this.assertOrganizationAccess(req, query.ownerId);
      return { organizationId: query.ownerId };
    }

    if (query.ownerType === "user") {
      if (!query.ownerId) {
        throw new BadRequestException(
          "ownerId es requerido cuando ownerType=user",
        );
      }
      this.assertPersonalAccess(req, query.ownerId);
      return { userId: query.ownerId };
    }

    const workspaceId = this.workspaceContext.getWorkspaceId();
    if (workspaceId) {
      await this.assertOrganizationAccess(req, workspaceId);
      return { organizationId: workspaceId };
    }

    return { userId: req.user.id };
  }

  private async assertOrganizationAccess(
    req: RequestWithUser,
    organizationId: string,
  ): Promise<void> {
    if (this.isGlobalAdmin(req)) return;

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new ForbiddenException(
        "No tienes acceso al historial de esta organización",
      );
    }
  }

  private assertPersonalAccess(req: RequestWithUser, userId: string): void {
    if (this.isGlobalAdmin(req)) return;
    if (req.user?.id !== userId) {
      throw new ForbiddenException("No tienes acceso a este historial");
    }
  }

  private isGlobalAdmin(req: RequestWithUser): boolean {
    return (
      req.user?.permits?.name === "SUPERADMIN" ||
      req.user?.permits?.name === "ADMIN"
    );
  }
}
