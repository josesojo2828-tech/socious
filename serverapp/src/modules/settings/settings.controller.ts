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
import { assertCanEditOrganization } from "src/shared/services/organization-write-access";
import { UpdateTenantSettingsDto } from "./dto/settings.dto";
import type { RequestWithUser } from "src/shared/types/server.type";

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
    await assertCanEditOrganization(
      this.prisma,
      request.user as any,
      organizationId,
    );
  }

  /**
   * The response also carries `planModules` (the resolved entitlement module
   * keys) so the settings screen can hide the AVANZADO+ sections — shipping,
   * delivery and routes — for a Básico tenant instead of offering switches
   * that only exist in higher plans.
   */

  /**
   * Module keys that gate the settings sections. For the caller's own workspace
   * the session entitlements are authoritative (no extra query); for a foreign
   * organization — only reachable by a platform role — they are derived from
   * that organization's active grants and add-ons.
   */
  private async resolvePlanModules(
    request: RequestWithUser,
    organizationId: string | null,
    ownModules: string[],
  ): Promise<string[]> {
    if (!organizationId) return ownModules;

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: (request.user as { id: string }).id,
        organizationId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (membership) return ownModules;

    const now = new Date();
    const [grants, entitlements] = await Promise.all([
      this.prisma.moduleGrant.findMany({
        where: { organizationId, status: "ACTIVE" },
        select: { module: { select: { key: true } }, expiresAt: true },
      }),
      this.prisma.entitlement.findMany({
        where: { organizationId, status: "ACTIVE" },
        select: { addOn: { select: { modules: true, active: true } } },
      }),
    ]);

    const keys = new Set<string>();
    for (const grant of grants) {
      if (grant.expiresAt && grant.expiresAt < now) continue;
      keys.add(grant.module.key);
    }
    for (const entitlement of entitlements) {
      if (entitlement.addOn.active === false) continue;
      for (const key of entitlement.addOn.modules ?? []) keys.add(key);
    }
    return [...keys];
  }

  private async withPlanModules<T extends object>(
    request: RequestWithUser,
    settings: T,
    organizationId: string | null,
  ): Promise<
    T & {
      planModules: string[];
      manualGrants: string[];
      planId: string | null;
      /** Cliente mayorista (S1): habilita los campos de mayoreo. */
      wholesaler: boolean;
    }
  > {
    const entitlements = (request.user as { entitlements?: {
      modules?: { key: string }[];
    } })?.entitlements;
    // El admin de plataforma mira la configuracion de un cliente: sus propios
    // entitlements no dicen nada de ese plan. Cuando la organizacion pedida no
    // es una membresia del que llama, los modulos se resuelven desde la
    // organizacion (grants activos + add-ons contratados).
    const planModules = await this.resolvePlanModules(
      request,
      organizationId,
      entitlements?.modules?.map((m) => m.key) ?? [],
    );
    // Manual org grants are read straight from the table: the entitlement
    // resolver only includes them when the module-framework flag is on, and
    // the Sucursales gate must work either way (feedback round 2, #1).
    const grants = organizationId
      ? await this.prisma.moduleGrant.findMany({
          where: { organizationId, status: "ACTIVE" },
          select: { module: { select: { key: true } } },
        })
      : [];
    const activeSubscription = organizationId
      ? await this.prisma.subscription.findFirst({
          where: { organizationId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: { planId: true },
        })
      : null;
    const imageLimits = await this.tenantSettings.imageLimits(organizationId);
    const organization = organizationId
      ? await this.prisma.organization.findFirst({
          where: { id: organizationId },
          select: { isWholesaler: true, isMeatProcessing: true },
        })
      : null;
    return {
      ...settings,
      wholesaler: organization?.isWholesaler ?? false,
      meatProcessing: organization?.isMeatProcessing ?? false,
      isMeatProcessing: organization?.isMeatProcessing ?? false,
      planModules,
      manualGrants: [...new Set(grants.map((g) => g.module.key))],
      planId: activeSubscription?.planId ?? null,
      imageLimits,
    };
  }

  @Get()
  async getSettings(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrganizationId(request);
    const settings = await this.tenantSettings.get(organizationId);
    return this.withPlanModules(request, settings, organizationId);
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
      select: {
        id: true,
        status: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandPrimary: true,
        brandAccent: true,
      },
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
      store: {
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        brandPrimary: organization.brandPrimary,
        brandAccent: organization.brandAccent,
        whatsapp: settings.storefront?.whatsapp || null,
      },
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
    return this.withPlanModules(request, settings, organizationId);
  }
}
