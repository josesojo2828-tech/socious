import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import { PurchaseService, PurchaseScope } from "./purchase.service";
import {
  AddPurchasePaymentDto,
  CreatePurchaseDto,
  ListPurchasesQueryDto,
  PurchasesReportQueryDto,
  SavePurchaseDraftDto,
} from "./dto/purchase.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { FastifyReply } from "fastify";
import type { RequestWithUser } from "src/shared/types/server.type";
import { StorageService } from "src/modules/file/storage.service";

/** Purchases from suppliers (S8), tenant-scoped. */
@Controller("api/purchases")
@UseGuards(SessionAuthGuard)
export class PurchaseController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<PurchaseScope> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return {
      organizationId: resolved.organizationId,
      createdById: request.user.id,
    };
  }

  @Get("report")
  async getReport(
    @Req() request: RequestWithUser,
    @Query() query: PurchasesReportQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.getReport(scope, query);
  }

  @Get()
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListPurchasesQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.list(scope, query);
  }

  // ------------------------------------------------------------------
  // Drafts (S13): ONE slot per organization + creator, never a global
  // collection. Declared before `GET :id` so "drafts" is never parsed as
  // a purchase id.
  // ------------------------------------------------------------------

  /** MY account draft, or null (the personal context has no draft slot). */
  @Get("drafts")
  async getDraft(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    if (!scope.organizationId || !scope.createdById) return null;

    return this.prisma.purchaseDraft.findFirst({
      where: {
        organizationId: scope.organizationId,
        createdById: scope.createdById,
      },
    });
  }

  /** Upserts MY draft on the [organizationId, createdById] unique key. */
  @Put("drafts")
  async saveDraft(
    @Req() request: RequestWithUser,
    @Body() body: SavePurchaseDraftDto,
  ) {
    const scope = await this.resolveScope(request);
    if (!scope.organizationId || !scope.createdById) {
      throw new BadRequestException(
        "Se necesita una organización activa para guardar borradores en tu cuenta.",
      );
    }

    const where = {
      organizationId: scope.organizationId,
      createdById: scope.createdById,
    };
    const payload = body.payload as Prisma.InputJsonValue;
    const name = body.name ?? null;

    const existing = await this.prisma.purchaseDraft.findFirst({ where });
    if (existing) {
      return this.prisma.purchaseDraft.update({
        where: { id: existing.id },
        data: { name, payload },
      });
    }

    return this.prisma.purchaseDraft.create({
      data: { ...where, name, payload },
    });
  }

  /** Discards MY draft; idempotent (no draft left is already success). */
  @Delete("drafts")
  async deleteDraft(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    if (scope.organizationId && scope.createdById) {
      await this.prisma.purchaseDraft.deleteMany({
        where: {
          organizationId: scope.organizationId,
          createdById: scope.createdById,
        },
      });
    }
    return { deleted: true };
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.getOne(scope, id);
  }

  /**
   * Signed URL of the attached invoice (S14 #5). Same SessionAuthGuard +
   * organization scope as the rest of the controller: a member of another
   * workspace gets 404 (the lookup is org-scoped), never a URL.
   */
  @Get(":id/invoice")
  async getInvoice(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Res() res: FastifyReply,
  ) {
    const scope = await this.resolveScope(request);
    const { key } = await this.purchaseService.getInvoice(scope, id);

    // Stream autenticado: la clave nunca sale y el navegador no necesita
    // alcanzar el host de MinIO (patrón del FileController público).
    const { stream, contentType } = await this.storageService.getFileStream(key);
    res.header("Cache-Control", "private, no-store");
    if (stream && typeof stream.transformToByteArray === "function") {
      const bytes = await stream.transformToByteArray();
      return res.status(200).type(contentType).send(Buffer.from(bytes));
    }
    if (stream && typeof stream.pipe === "function") {
      res.type(contentType);
      return res.send(stream);
    }
    return res.status(404).send({ message: "File stream unavailable" });
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreatePurchaseDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.create(scope, body);
  }

  @Post(":id/receive")
  async receive(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.receive(scope, id);
  }

  @Post(":id/payments")
  async addPayment(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AddPurchasePaymentDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.addPayment(scope, id, body);
  }

  @Post(":id/cancel")
  async cancel(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.purchaseService.cancel(scope, id);
  }
}
