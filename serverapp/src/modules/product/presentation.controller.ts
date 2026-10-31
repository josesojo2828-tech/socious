import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { PresentationService } from "./presentation.service";
import { UpdatePresentationDto } from "./dto/presentation.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Presentation updates/deletes live on their own resource (S4). */
@Controller("api/presentations")
@UseGuards(SessionAuthGuard)
export class PresentationController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly presentations: PresentationService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrg(request: RequestWithUser): Promise<string | null> {
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

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdatePresentationDto,
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar presentaciones.",
      );
    }
    return this.presentations.update(organizationId, id, body);
  }

  // Imágenes de la variante (S8)
  @Post(":id/images")
  async addImage(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { key?: string },
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar imágenes.",
      );
    }
    if (!body.key?.trim()) {
      throw new BadRequestException("Falta la imagen subida.");
    }
    return this.presentations.addImage(organizationId, id, body.key.trim());
  }

  @Delete("images/:imageId")
  async removeImage(
    @Req() request: RequestWithUser,
    @Param("imageId") imageId: string,
  ) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar imágenes.",
      );
    }
    return this.presentations.removeImage(organizationId, imageId);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const organizationId = await this.resolveOrg(request);
    if (!organizationId) {
      throw new UnauthorizedException(
        "Crea una organización para gestionar presentaciones.",
      );
    }
    return this.presentations.remove(organizationId, id);
  }
}
