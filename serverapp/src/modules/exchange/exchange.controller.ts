import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { ExchangeService } from './exchange.service';
import { Public } from 'src/shared/decorators/public.decorator';
import { SessionAuthGuard } from '../auth/guards/authenticated.guard';
import { WorkspaceContextService } from 'src/shared/services/workspace-context.service';
import { OrganizationScopeService } from 'src/shared/services/organization-scope.service';
import type { RequestWithUser } from 'src/shared/types/server.type';
import { CURRENCY_CODES } from 'src/shared/constants/payment-methods';

export class RecordRatesDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  rateBcv: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  rateUsdt: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  rateParallel?: number;

  @IsOptional()
  @IsString()
  @IsIn(['MANUAL', 'BCV_API', 'BINANCE_P2P'])
  source?: string;
}

const CURRENCY_LABELS: Record<string, string> = {
  USD: 'Dólar (USD)',
  VES: 'Bolívar (VES)',
  USDT: 'Tether (USDT)',
  EUR: 'Euro (EUR)',
};

@Controller('api/exchange')
export class ExchangeController {
  /** Shared tenant-isolation rule for the `x-workspace-id` header. */
  private readonly organizationScope: OrganizationScopeService;

  constructor(
    private readonly exchangeService: ExchangeService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly prisma: PrismaService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  private async resolveOrganizationId(
    request: RequestWithUser,
  ): Promise<string | null> {
    if (!request.user) {
      throw new UnauthorizedException('No autorizado');
    }

    const scope = await this.organizationScope.resolveOrganizationScope({
      user: request.user as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: 'personal',
      missingFallback: 'personal',
    });

    return scope.organizationId;
  }

  // ---------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------

  @Public()
  @Get('rates')
  async getRates() {
    return this.exchangeService.getRates();
  }

  @Public()
  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: 'USD' | 'VES',
    @Query('to') to: 'USD' | 'VES',
  ) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return { error: 'Invalid amount' };
    }
    return this.exchangeService.convert(numAmount, from || 'USD', to || 'VES');
  }

  @Public()
  @Get('bcv')
  async getBcvRate() {
    const rate = await this.exchangeService.getBcvRate();
    return { rate, currency: 'USD/VES' };
  }

  /**
   * Quotes the UI can show (S3).
   *
   * `storage: true` means the amount is also persisted in that currency;
   * `EUR` is display-only for now — the upstream reports `bcv.eur`, but
   * documents are always stored in USD/VES/USDT.
   */
  @Public()
  @Get('currencies')
  getCurrencies() {
    return [
      ...CURRENCY_CODES.map((code) => ({
        code,
        label: CURRENCY_LABELS[code] ?? code,
        storage: true,
      })),
      { code: 'EUR', label: CURRENCY_LABELS.EUR, storage: false },
    ];
  }

  // ---------------------------------------------------------------
  // Authenticated
  // ---------------------------------------------------------------

  /** Latest frozen-rate snapshot the tenant would use on a new document. */
  @Get('rates/latest')
  @UseGuards(SessionAuthGuard)
  async getLatestRates(@Req() request: RequestWithUser) {
    const organizationId = await this.resolveOrganizationId(request);
    return this.exchangeService.getLatestSnapshot(organizationId);
  }

  @Get('rates/history')
  @UseGuards(SessionAuthGuard)
  async getRateHistory(
    @Req() request: RequestWithUser,
    @Query('limit') limit?: string,
  ) {
    const organizationId = await this.resolveOrganizationId(request);
    const parsed = limit ? parseInt(limit, 10) : 30;
    return this.exchangeService.getHistory(
      organizationId,
      Number.isFinite(parsed) ? parsed : 30,
    );
  }

  /** Records today's rates so documents freeze a real snapshot. */
  @Post('rates')
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async recordRates(
    @Body() body: RecordRatesDto,
    @Req() request: RequestWithUser,
  ) {
    const organizationId = await this.resolveOrganizationId(request);

    return this.exchangeService.recordRates({
      organizationId,
      rateBcv: body.rateBcv,
      rateUsdt: body.rateUsdt,
      rateParallel: body.rateParallel ?? null,
      source: body.source ?? 'MANUAL',
      createdById: request.user?.id ?? null,
    });
  }
}
