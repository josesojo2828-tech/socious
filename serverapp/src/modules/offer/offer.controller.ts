import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { OfferService } from "./offer.service";
import { CreateOfferDto, UpdateOfferDto } from "./dto/offer.dto";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Promotional offers (S9) — Avanzado/Premium via the OFFERS module. */
@Controller("api/offers")
@UseGuards(SessionAuthGuard)
export class OfferController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly offers: OfferService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async requireOrg(request: RequestWithUser): Promise<string> {
    if (!request.user) throw new UnauthorizedException("No autorizado");
    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });
    if (!resolved.organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar ofertas.",
      );
    }
    return resolved.organizationId;
  }

  /** Módulo OFFERS solo en Avanzado/Premium (S9/S10). */
  private assertOffersEnabled(request: RequestWithUser): void {
    const modules =
      (request.user as { entitlements?: { modules?: { key: string }[] } })
        ?.entitlements?.modules ?? [];
    if (!modules.some((m) => m.key === "OFFERS")) {
      throw new ForbiddenException(
        "Las ofertas requieren el plan Avanzado o superior.",
      );
    }
  }

  @Get()
  async list(@Req() request: RequestWithUser) {
    const organizationId = await this.requireOrg(request);
    return this.offers.list(organizationId);
  }

  /**
   * Ofertas activas de una tienda (S11): consumo anónimo del storefront
   * `/shop/[slug]`. Una tienda desconocida o inactiva contesta lista vacía
   * — nunca 404 — para que la página distinga "sin ofertas" de "sin tienda"
   * por su propia ruta de configuración.
   */
  @Public()
  @Get("public/:slug")
  async listPublic(@Param("slug") slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!organization || organization.status !== "ACTIVE") {
      return { list: [] };
    }
    return { list: await this.offers.listPublic(organization.id) };
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const organizationId = await this.requireOrg(request);
    return this.offers.getOne(organizationId, id);
  }

  @Post()
  async create(@Req() request: RequestWithUser, @Body() body: CreateOfferDto) {
    this.assertOffersEnabled(request);
    const organizationId = await this.requireOrg(request);
    return this.offers.create(organizationId, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateOfferDto,
  ) {
    this.assertOffersEnabled(request);
    const organizationId = await this.requireOrg(request);
    return this.offers.update(organizationId, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    this.assertOffersEnabled(request);
    const organizationId = await this.requireOrg(request);
    return this.offers.remove(organizationId, id);
  }
}
