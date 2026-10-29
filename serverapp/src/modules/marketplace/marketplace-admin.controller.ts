import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CampaignPlanService } from './campaign-plan.service';
import { CampaignService } from './campaign.service';
import { WalletPaymentService } from './wallet-payment.service';
import { MarketplacePermissionService } from './marketplace-permission.service';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateCampaignPlanDto } from './dto/create-campaign-plan.dto';
import { UpdateCampaignPlanDto } from './dto/update-campaign-plan.dto';
import { SessionAuthGuard } from '../auth/guards/authenticated.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import type { RequestWithUser } from 'src/shared/types/server.type';

@Controller('api/marketplace/admin')
@UseGuards(SessionAuthGuard, AdminGuard)
export class MarketplaceAdmin {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly campaignPlanService: CampaignPlanService,
    private readonly campaignService: CampaignService,
    private readonly walletPaymentService: WalletPaymentService,
    private readonly marketplacePermissionService: MarketplacePermissionService,
  ) {}

  @Get('products')
  async findAll(@Query() query: QueryProductDto) {
    return this.marketplaceService.findAllAdmin(query);
  }

  @Patch('products/:id/approve')
  async approve(@Param('id') id: string) {
    return this.marketplaceService.approve(id);
  }

  @Patch('products/:id/reject')
  async reject(@Param('id') id: string) {
    return this.marketplaceService.reject(id);
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; description?: string; icon?: string }) {
    return this.marketplaceService.createCategory(body);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; icon?: string; isActive?: boolean },
  ) {
    return this.marketplaceService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.marketplaceService.deleteCategory(id);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.marketplaceService.getAdminDashboardStats();
  }

  @Get('campaign-plans')
  async findAllCampaignPlans() {
    return this.campaignPlanService.findAllAdmin();
  }

  @Post('campaign-plans')
  async createCampaignPlan(@Body() dto: CreateCampaignPlanDto) {
    return this.campaignPlanService.create(dto);
  }

  @Patch('campaign-plans/:id')
  async updateCampaignPlan(@Param('id') id: string, @Body() dto: UpdateCampaignPlanDto) {
    return this.campaignPlanService.update(id, dto);
  }

  @Delete('campaign-plans/:id')
  async removeCampaignPlan(@Param('id') id: string) {
    return this.campaignPlanService.remove(id);
  }

  @Patch('campaign-plans/:id/toggle')
  async toggleCampaignPlan(@Param('id') id: string) {
    return this.campaignPlanService.toggleActive(id);
  }

  @Post('campaign-plans/seed')
  async seedDefaultPlans() {
    return this.campaignPlanService.seedDefaultPlans();
  }

  @Get('wallet/payments')
  async findAllWalletPayments() {
    return this.walletPaymentService.findAllAdmin();
  }

  @Get('wallet/payments/pending')
  async findAllPendingPayments() {
    return this.walletPaymentService.findAllPending();
  }

  @Patch('wallet/payments/:id/approve')
  async approvePayment(@Param('id') id: string, @Body() body: { reviewNote?: string }, @Req() req: RequestWithUser) {
    return this.walletPaymentService.approve(id, req.user.id, body.reviewNote);
  }

  @Patch('wallet/payments/:id/reject')
  async rejectPayment(@Param('id') id: string, @Body() body: { reviewNote?: string }, @Req() req: RequestWithUser) {
    return this.walletPaymentService.reject(id, req.user.id, body.reviewNote);
  }

  @Get('campaigns')
  async findAllCampaigns() {
    return this.campaignService.findAllAdmin();
  }

  @Patch('campaigns/:id/cancel')
  async cancelCampaign(@Param('id') id: string) {
    return this.campaignService.cancel(id);
  }

  @Get('sellers')
  async getAllSellers() {
    return this.marketplacePermissionService.getSellerPermissions();
  }

  @Get('sellers/:userId/is-seller')
  async isSeller(@Param('userId') userId: string) {
    const isSeller = await this.marketplacePermissionService.isSeller(userId);
    return { isSeller };
  }

  @Post('sellers/:userId/grant')
  async grantSellerPermission(
    @Param('userId') userId: string,
    @Body() body: { expiresAt?: string },
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    return this.marketplacePermissionService.grantSellerPermission(userId, expiresAt);
  }

  @Delete('sellers/:userId/revoke')
  async revokeSellerPermission(@Param('userId') userId: string) {
    return this.marketplacePermissionService.revokeSellerPermission(userId);
  }
}
