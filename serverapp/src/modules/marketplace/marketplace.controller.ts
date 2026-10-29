import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CampaignPlanService } from './campaign-plan.service';
import { CampaignService } from './campaign.service';
import { WalletPaymentService } from './wallet-payment.service';
import { MarketplacePermissionService } from './marketplace-permission.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ReportPaymentDto } from './dto/report-payment.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SessionAuthGuard } from '../auth/guards/authenticated.guard';
import type { RequestWithUser } from 'src/shared/types/server.type';

@Controller('api/marketplace')
@UseGuards(SessionAuthGuard)
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly campaignPlanService: CampaignPlanService,
    private readonly campaignService: CampaignService,
    private readonly walletPaymentService: WalletPaymentService,
    private readonly marketplacePermissionService: MarketplacePermissionService,
  ) {}

  @Get('products')
  async findAll(@Query() query: QueryProductDto) {
    return this.marketplaceService.findAll(query);
  }

  @Get('products/:id')
  async findOne(@Param('id') id: string) {
    return this.marketplaceService.findOne(id);
  }

  @Post('products')
  async create(@Req() req: RequestWithUser, @Body() dto: CreateProductDto) {
    return this.marketplaceService.create(req.user.id, dto);
  }

  @Patch('products/:id')
  async update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateProductDto,
  ) {
    return this.marketplaceService.update(id, req.user.id, dto);
  }

  @Get('my-products')
  async findMyProducts(@Req() req: RequestWithUser) {
    return this.marketplaceService.findBySeller(req.user.id);
  }

  @Get('categories')
  async findCategories() {
    return this.marketplaceService.findCategories();
  }

  @Post('reviews')
  async createReview(
    @Req() req: RequestWithUser,
    @Body() body: { productId: string; rating: number; comment?: string },
  ) {
    return this.marketplaceService.createReview(body.productId, req.user.id, body.rating, body.comment);
  }

  @Get('reviews/:productId')
  async getReviews(@Param('productId') productId: string) {
    return this.marketplaceService.getReviewsByProduct(productId);
  }

  @Post('reviews/:id/respond')
  async respondToReview(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { response: string },
  ) {
    return this.marketplaceService.respondToReview(id, req.user.id, body.response);
  }

  @Delete('reviews/:id')
  async deleteReview(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.marketplaceService.deleteReview(id, req.user.id, false);
  }

  @Get('campaign-plans')
  async findAllCampaignPlans() {
    return this.campaignPlanService.findAll();
  }

  @Post('wallet/report-payment')
  async reportPayment(@Req() req: RequestWithUser, @Body() dto: ReportPaymentDto) {
    return this.walletPaymentService.reportPayment(req.user.id, dto);
  }

  @Get('wallet/balance')
  async getBalance(@Req() req: RequestWithUser) {
    return this.walletPaymentService.getBalance(req.user.id);
  }

  @Get('wallet/payments')
  async getMyPayments(@Req() req: RequestWithUser) {
    return this.walletPaymentService.getMyPayments(req.user.id);
  }

  @Post('campaigns')
  async createCampaign(@Req() req: RequestWithUser, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(req.user.id, dto);
  }

  @Get('campaigns')
  async findMyCampaigns(@Req() req: RequestWithUser) {
    return this.campaignService.findBySeller(req.user.id);
  }

  @Get('campaigns/:id')
  async findOneCampaign(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.campaignService.findOne(id, req.user.id);
  }

  @Get('campaigns/:id/metrics')
  async getCampaignMetrics(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.campaignService.getMetrics(id, req.user.id);
  }

  @Get('products/:id/campaign-status')
  async getProductCampaignStatus(@Param('id') id: string) {
    return this.campaignService.getProductCampaignStatus(id);
  }

  @Get('seller-status')
  async getSellerStatus(@Req() req: RequestWithUser) {
    const isSeller = await this.marketplacePermissionService.isSeller(req.user.id);
    return { isSeller };
  }

  @Post('track/impression/:campaignId')
  async trackImpression(@Param('campaignId') campaignId: string) {
    return this.campaignService.trackImpression(campaignId);
  }

  @Post('track/click/:campaignId')
  async trackClick(@Param('campaignId') campaignId: string) {
    return this.campaignService.trackClick(campaignId);
  }

  @Post('track/conversion/:campaignId')
  async trackConversion(@Param('campaignId') campaignId: string) {
    return this.campaignService.trackConversion(campaignId);
  }

  @Post('track/impression/product/:productId')
  async trackImpressionByProduct(@Param('productId') productId: string) {
    return this.campaignService.trackImpressionByProduct(productId);
  }

  @Post('track/click/product/:productId')
  async trackClickByProduct(@Param('productId') productId: string) {
    return this.campaignService.trackClickByProduct(productId);
  }

  @Post('campaigns/:id/renew')
  async renewCampaign(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.campaignService.renew(req.user.id, id);
  }

  @Post('campaigns/:id/extend')
  async extendCampaign(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { additionalDays: number },
  ) {
    return this.campaignService.extend(req.user.id, id, body.additionalDays);
  }
}
