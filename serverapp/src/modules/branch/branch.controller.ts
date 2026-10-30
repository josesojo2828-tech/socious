import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { BranchService, BranchScope } from "./branch.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import type { RequestWithUser } from "src/shared/types/server.type";

/** Branches (S10): listed for everyone in the workspace, extended by plan. */
@Controller("api/branches")
@UseGuards(SessionAuthGuard)
export class BranchController {
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly branchService: BranchService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveScope(request: RequestWithUser): Promise<BranchScope> {
    if (!request.user) {
      throw new UnauthorizedException("No autorizado");
    }

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return { organizationId: resolved.organizationId };
  }

  @Get()
  async list(@Req() request: RequestWithUser) {
    const scope = await this.resolveScope(request);
    return this.branchService.list(scope);
  }

  @Post()
  async create(@Req() request: RequestWithUser, @Body() body: CreateBranchDto) {
    const scope = await this.resolveScope(request);
    return this.branchService.create(scope, body);
  }

  @Patch(":id")
  async update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateBranchDto,
  ) {
    const scope = await this.resolveScope(request);
    return this.branchService.update(scope, id, body);
  }

  @Delete(":id")
  async remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    const scope = await this.resolveScope(request);
    return this.branchService.remove(scope, id);
  }
}
