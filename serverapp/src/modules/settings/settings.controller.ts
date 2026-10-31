import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
  NotFoundException,
  Param,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { isAdmin } from "../permit/authz";
import { UpdateTenantSettingsDto } from "./dto/settings.dto";
import type { RequestWithUser } from "src/shared/types/server.type";

// CLINIC_ADMIN is the legacy org-admin role: `module-framework` still
// checks it, so it keeps editing settings until roles are audited.
const EDITABLE_ROLES = ["OWNER", "ADMIN", "CLINIC_ADMIN"] as const;

/**
 * Tenant configuration surface (S1).
 *
 * `GET /api/settings` — any authenticated member of the workspace; without an
 * organization it returns the defaults, so the settings screen always renders.
 * `PATCH /api/settings` — requires a resolved organization and the OWNER/ADMIN
 * membership (or a platform role): flipping `cash.shiftControl` or the visible
 * currencies is an operator decision, not any member's.
 */
@Controller("api/settings")
@UseGuards(SessionAuthGuard)
export class SettingsController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly tenantSettings: TenantSettingsService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrganizationId(
    request: RequestWithUser,
  ): Promise<string | null> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return resolved.organizationId;
  }

  private async assertCanEdit(
    request: RequestWithUser,
    organizationId: string,
  ): Promise<void> {
    const user = request.user;
    if (isAdmin(user as any)) return;

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId,
        status: "ACTIVE",
        role: { in: [...EDITABLE_ROLES] },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        "Solo el propietario o un administrador de la organización puede cambiar la configuración.",
      );
    }
  }

  /**
   * The response also carries `planModules` (the resolved entitlement module
   * keys) so the settings screen can hide the AVANZADO+ sections — shipping,
   * delivery and routes — for a Básico tenant instead of offering switches
   * that only exist in higher plans.
   */
  private withPlanModules<T extends object>(
    request: RequestWithUser,
    settings: T,
  ): T & { planModules: string[] } {
    const entitlements = (request.user as { entitlements?: {
      modules?: { key: string }[];
    } })?.entitlements;
    const planModules = entitlements?.modules?.map((m) => m.key) ?? [];
    return { ...settings, planModules };
  }

  @Get()
  async getSettings(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrganizationId(request);
    const settings = await this.tenantSettings.get(organizationId);
    return this.withPlanModules(request, settings);
  }

  /**
   * Checkout configuration for a public storefront (S12): a visitor of
   * `shop/[slug]` needs to know which fulfillment options THIS shop offers
   * before posting an order. Only display-level flags leave the server — never
   * anything that grants access.
   */
  @Public()
  @Get("public/:slug")
  async getPublicCheckoutConfig(@Param("slug") slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!organization || organization.status !== "ACTIVE") {
      throw new NotFoundException("Tienda no encontrada.");
    }

    const settings = await this.tenantSettings.get(organization.id);
    const agencies = await this.prisma.shippingAgency.findMany({
      where: { active: true },
      select: { id: true, key: true, name: true },
    });

    return {
      fulfillmentTypes: settings.fulfillment.enabledTypes,
      coordination: settings.fulfillment.coordination,
      delivery: {
        enabled: settings.delivery.enabled,
        feeUSD: settings.delivery.feeUSD,
      },
      agencies: agencies.filter((agency) =>
        settings.shipping.enabledAgencies.includes(agency.key),
      ),
    };
  }

  @Patch()
  async updateSettings(
    @Req() request: RequestWithUser,
    @Body() body: UpdateTenantSettingsDto,
  ) {
    const organizationId = await this.resolveOrganizationId(request);

    if (!organizationId) {
      throw new ForbiddenException(
        "Crea una organización para configurar el negocio.",
      );
    }

    await this.assertCanEdit(request, organizationId);
    const settings = await this.tenantSettings.update(organizationId, body);
    return this.withPlanModules(request, settings);
  }
}
