import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { RequestWithUser } from "src/shared/types/server.type";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import { OrgAdminGuard } from "./guards/org-admin.guard";
import { EntitlementAdminService } from "./entitlement-admin.service";
import { EnableEntitlementDto } from "./dto/entitlement.dto";

/**
 * Add-on entitlement CRUD (design Phase 4).
 *
 * Authentication is global (`SessionAuthGuard` APP_GUARD), which also attaches
 * the resolved entitlements to `request.user`. Organization mutations require
 * `OrgAdminGuard` (CLINIC_ADMIN or global admin); personal mutations require
 * self or global admin.
 */
@Controller("api/entitlements")
export class EntitlementController {
  constructor(
    private readonly admin: EntitlementAdminService,
    private readonly entitlements: EntitlementService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  /** Resolved `{ permissions, modules, fieldPolicies }` for the current workspace. */
  @Get("me")
  me(@Req() req: RequestWithUser) {
    const organizationId = this.workspaceContext.getWorkspaceId();
    return this.entitlements.resolve(req.user.id, organizationId, req.user);
  }

  /** Active add-on catalog. */
  @Get("addons")
  listAddOns() {
    return this.admin.listActiveAddOns();
  }

  @Get("organizations/:id")
  @UseGuards(OrgAdminGuard)
  listForOrganization(@Param("id") organizationId: string) {
    return this.admin.listForOrganization(organizationId);
  }

  @Post("organizations/:id")
  @UseGuards(OrgAdminGuard)
  enableForOrganization(
    @Param("id") organizationId: string,
    @Body() dto: EnableEntitlementDto,
    @Req() req: RequestWithUser,
  ) {
    return this.admin.enableForOrganization(organizationId, dto, req.user?.id);
  }

  @Delete("organizations/:id/:entitlementId")
  @UseGuards(OrgAdminGuard)
  disableForOrganization(
    @Param("id") organizationId: string,
    @Param("entitlementId") entitlementId: string,
  ) {
    return this.admin.disableForOrganization(organizationId, entitlementId);
  }

  @Get("users/:id")
  listForUser(@Req() req: RequestWithUser, @Param("id") userId: string) {
    this.assertUserAccess(req, userId);
    return this.admin.listForUser(userId);
  }

  @Post("users/:id")
  enableForUser(
    @Req() req: RequestWithUser,
    @Param("id") userId: string,
    @Body() dto: EnableEntitlementDto,
  ) {
    this.assertUserAccess(req, userId);
    return this.admin.enableForUser(userId, dto, req.user?.id);
  }

  @Delete("users/:id/:entitlementId")
  disableForUser(
    @Req() req: RequestWithUser,
    @Param("id") userId: string,
    @Param("entitlementId") entitlementId: string,
  ) {
    this.assertUserAccess(req, userId);
    return this.admin.disableForUser(userId, entitlementId);
  }

  /** Personal entitlements are visible to the owner and global admins only. */
  private assertUserAccess(req: RequestWithUser, userId: string): void {
    if (req.user?.id === userId) return;
    const name = req.user?.permits?.name;
    if (name === "SUPERADMIN" || name === "ADMIN") return;
    throw new ForbiddenException(
      "No tienes acceso a los entitlements de este usuario",
    );
  }
}
