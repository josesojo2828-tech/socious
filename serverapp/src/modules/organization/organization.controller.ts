import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from 'src/modules/auth/guards/authenticated.guard';
import type { RequestWithUser } from 'src/shared/types/server.type';
import { OrganizationService } from './organization.service';
import { OrgAdminGuard } from './guards/org-admin.guard';
import { FieldPolicy } from "src/modules/permit/field-policy/field-policy.decorator";
import { CreateOrganizationDto, InviteMemberDto, UpdateMemberColorDto, UpdateMemberRoleDto, PurchaseSeatsDto, UpdateSeatsDto, CreateWorkspaceSubscriptionDto } from './dto/organization.dto';

@Controller('api/organizations')
@UseGuards(SessionAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('my-workspaces')
  async getMyWorkspaces(@Req() req: RequestWithUser) {
    return this.organizationService.getUserOrganizations(req.user.id);
  }

  @Post('create')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.createOrganization(dto, req.user.id);
  }

  @Get(':id')
  async getOrganizationDetails(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.getOrganizationDetails(orgId, req.user.id);
  }

  @Get(':id/stats')
  async getOrganizationStats(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.getClinicStats(orgId, req.user.id);
  }

  @Get(':id/personal-stats')
  async getPersonalClinicStats(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.getPersonalClinicStats(orgId, req.user.id);
  }

  @Post(':id/members/invite')
  @UseGuards(OrgAdminGuard)
  async inviteMember(
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.inviteMember(orgId, dto, req.user.id);
  }

  @Post('accept-invite')
  @UseGuards(SessionAuthGuard)
  async acceptInvite(
    @Body('token') token: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.acceptInvitation(token, req.user.id);
  }

  @Post('reject-invite')
  @UseGuards(SessionAuthGuard)
  async rejectInvite(
    @Body('token') token: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.rejectInvitation(token, req.user.id);
  }

  @Post(':id/accept-invite-by-org')
  @UseGuards(SessionAuthGuard)
  async acceptInviteByOrg(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.acceptInvitationByOrg(orgId, req.user.id);
  }

  @Post(':id/reject-invite-by-org')
  @UseGuards(SessionAuthGuard)
  async rejectInviteByOrg(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.rejectInvitationByOrg(orgId, req.user.id);
  }

  @Patch(':id/members/:memberId/color')
  @UseGuards(OrgAdminGuard)
  async updateMemberColor(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberColorDto,
  ) {
    return this.organizationService.updateMemberColor(orgId, memberId, dto.colorHex);
  }

  @Patch(':id/members/:memberId/role')
  @UseGuards(OrgAdminGuard)
  async updateMemberRole(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationService.updateMemberRole(orgId, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(OrgAdminGuard)
  async removeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.removeMember(orgId, memberId, req.user.id);
  }

  @Get(':id/members/:memberId/summary')
  async getMemberSummary(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationService.getMemberSummary(orgId, memberId);
  }

  @Get(':id/appointments/today')
  async getTodayClinicAppointments(@Param('id') orgId: string) {
    return this.organizationService.getTodayClinicAppointments(orgId);
  }

  @Post(':id/seats/purchase')
  @UseGuards(OrgAdminGuard)
  async purchaseSeats(
    @Param('id') orgId: string,
    @Body() dto: PurchaseSeatsDto,
  ) {
    return this.organizationService.purchaseSeats(orgId, dto.additionalSeats);
  }

  @Patch(':id/seats')
  @UseGuards(OrgAdminGuard)
  async updateSeats(
    @Param('id') orgId: string,
    @Body() dto: UpdateSeatsDto,
  ) {
    return this.organizationService.adminUpdateSeats(orgId, dto.maxSeats);
  }

  @Get(':id/subscription')
  async getOrganizationSubscription(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.getOrganizationSubscription(orgId, req.user.id);
  }

  @Get(':id/subscription-status')
  async getOrganizationSubscriptionStatus(
    @Param('id') orgId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.getOrganizationSubscriptionStatus(orgId, req.user.id);
  }

  @Post(':id/subscription')
  @UseGuards(OrgAdminGuard)
  async createOrganizationSubscription(
    @Param('id') orgId: string,
    @Body() dto: CreateWorkspaceSubscriptionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationService.createOrganizationSubscription(
      orgId,
      req.user.id,
      dto.planId,
      dto.autoRenew,
      dto.ignorePayment,
    );
  }
}

