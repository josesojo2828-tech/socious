import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { ClientService, ClientScope } from "./client.service";
import {
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from "./dto/client.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/**
 * Quick client CRM (S3): name + contact, optional document, credit limit and
 * outstanding balance. Every route is tenant-scoped through
 * `OrganizationScopeService`, so a foreign `x-workspace-id` header can never
 * expose another organization's clients.
 */
@Controller("api/clients")
@UseGuards(SessionAuthGuard)
export class ClientController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly clientService: ClientService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(
    request: RequestWithUser,
  ): Promise<ClientScope> {
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

  @Get()
  async list(
    @Req() request: RequestWithUser,
    @Query() query: ListClientsQueryDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.clientService.list(scope, query);
  }

  @Get(":id/balance")
  async getBalance(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.clientService.getBalance(scope, id);
  }

  @Get(":id")
  async getOne(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.clientService.getOne(scope, id);
  }

  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() body: CreateClientDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.clientService.create(scope, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateClientDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.clientService.update(scope, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.clientService.remove(scope, id);
  }
}
