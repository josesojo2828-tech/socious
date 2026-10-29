import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'nestjs-prisma';
import { firstValueFrom } from 'rxjs';
import type {
  ExchangeRateResponse,
  ExchangeRateCache,
  ConversionResult,
} from '../../shared/types/exchange.types';
import type { RateSnapshot } from '../../shared/utils/money';

const EXCHANGE_API_URL =
  'https://backend-cambiofrito.ramirezicode.com.ve/api/rates/all';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Persisted rate row (Decimal columns already normalized to numbers). */
export interface PersistedRateView {
  id: string | null;
  organizationId: string | null;
  rateBcv: number;
  rateUsdt: number;
  rateParallel: number | null;
  date: string;
  source: string;
  /** False when the values came from the live API and were not stored. */
  persisted: boolean;
}

export interface RecordRatesInput {
  organizationId?: string | null;
  rateBcv: number;
  rateUsdt: number;
  rateParallel?: number | null;
  source?: string;
  createdById?: string | null;
}

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private cache: ExchangeRateCache | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Fetch exchange rates from external API with in-memory cache (5 min TTL).
   * Falls back to last cached value if API fails.
   */
  async getRates(): Promise<ExchangeRateResponse> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<ExchangeRateResponse>(EXCHANGE_API_URL, {
          timeout: 10000,
        }),
      );

      const data = response.data;

      if (data.success) {
        this.cache = { data, fetchedAt: now };
        this.logger.log(
          `Exchange rates updated — BCV USD: ${data.bcv.usd}, Binance: ${data.binance.rate}`,
        );
        return data;
      }

      this.logger.warn('Exchange API returned success=false, using cache');
      return this.cache?.data ?? this.fallbackRates();
    } catch (error) {
      this.logger.error('Failed to fetch exchange rates:', error.message);
      return this.cache?.data ?? this.fallbackRates();
    }
  }

  /**
   * Get BCV official rate (USD → VES).
   */
  async getBcvRate(): Promise<number> {
    const rates = await this.getRates();
    return rates.bcv.usd;
  }

  /**
   * Get Binance parallel rate (USD → VES).
   */
  async getBinanceRate(): Promise<number> {
    const rates = await this.getRates();
    return rates.binance.rate;
  }

  /**
   * Convert USD to VES using BCV rate.
   */
  async convertUsdToVes(amountUsd: number): Promise<ConversionResult> {
    const rate = await this.getBcvRate();
    const converted = amountUsd * rate;

    return {
      amount: amountUsd,
      from: 'USD',
      to: 'VES',
      rate,
      converted,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert VES to USD using BCV rate.
   */
  async convertVesToUsd(amountVes: number): Promise<ConversionResult> {
    const rate = await this.getBcvRate();
    const converted = amountVes / rate;

    return {
      amount: amountVes,
      from: 'VES',
      to: 'USD',
      rate,
      converted,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generic conversion helper.
   */
  async convert(
    amount: number,
    from: 'USD' | 'VES',
    to: 'USD' | 'VES',
  ): Promise<ConversionResult> {
    if (from === to) {
      return {
        amount,
        from,
        to,
        rate: 1,
        converted: amount,
        timestamp: new Date().toISOString(),
      };
    }

    if (from === 'USD' && to === 'VES') {
      return this.convertUsdToVes(amount);
    }

    return this.convertVesToUsd(amount);
  }

  // ==========================================================
  // Persisted rate snapshots (Socius ERP)
  // ==========================================================

  /**
   * Latest persisted rate for a tenant, falling back to the platform-global
   * row (`organizationId = null`) and, when the database has no rows at all, to
   * the live external API (not persisted).
   */
  async getLatestSnapshot(
    organizationId?: string | null,
  ): Promise<PersistedRateView> {
    const organizationFilter = organizationId
      ? [{ organizationId }, { organizationId: null }]
      : [{ organizationId: null }];

    const row = await this.prisma.exchangeRate.findFirst({
      where: { OR: organizationFilter },
      orderBy: { date: 'desc' },
    });

    if (row) {
      return {
        id: row.id,
        organizationId: row.organizationId,
        rateBcv: Number(row.rateBcv),
        rateUsdt: Number(row.rateUsdt),
        rateParallel: row.rateParallel === null ? null : Number(row.rateParallel),
        date: row.date.toISOString(),
        source: row.source,
        persisted: true,
      };
    }

    const live = await this.getRates();
    return {
      id: null,
      organizationId: null,
      rateBcv: live.bcv.usd,
      rateUsdt: live.binance.rate,
      rateParallel: null,
      date: live.timestamp,
      source: live.success ? 'BCV_API' : 'FALLBACK',
      persisted: false,
    };
  }

  /**
   * Rates to freeze on a new document. An explicit override (the cashier typed
   * today's rate) wins; otherwise the latest persisted snapshot is used.
   */
  async resolveRates(
    organizationId?: string | null,
    override?: Partial<RateSnapshot> | null,
  ): Promise<RateSnapshot> {
    if (
      override?.rateBcv !== undefined &&
      override?.rateUsdt !== undefined &&
      Number(override.rateBcv) > 0 &&
      Number(override.rateUsdt) > 0
    ) {
      return {
        rateBcv: Number(override.rateBcv),
        rateUsdt: Number(override.rateUsdt),
      };
    }

    const latest = await this.getLatestSnapshot(organizationId);
    return { rateBcv: latest.rateBcv, rateUsdt: latest.rateUsdt };
  }

  /** Stores a rate row (manual capture or a scheduled API pull). */
  async recordRates(input: RecordRatesInput): Promise<PersistedRateView> {
    if (!(input.rateBcv > 0) || !(input.rateUsdt > 0)) {
      throw new Error('Las tasas BCV y USDT deben ser mayores que cero.');
    }

    const row = await this.prisma.exchangeRate.create({
      data: {
        organizationId: input.organizationId ?? null,
        rateBcv: input.rateBcv,
        rateUsdt: input.rateUsdt,
        rateParallel: input.rateParallel ?? null,
        source: input.source ?? 'MANUAL',
        createdById: input.createdById ?? null,
      },
    });

    return {
      id: row.id,
      organizationId: row.organizationId,
      rateBcv: Number(row.rateBcv),
      rateUsdt: Number(row.rateUsdt),
      rateParallel: row.rateParallel === null ? null : Number(row.rateParallel),
      date: row.date.toISOString(),
      source: row.source,
      persisted: true,
    };
  }

  /** Most recent persisted rows visible to a tenant, newest first. */
  async getHistory(
    organizationId?: string | null,
    limit = 30,
  ): Promise<PersistedRateView[]> {
    const organizationFilter = organizationId
      ? [{ organizationId }, { organizationId: null }]
      : [{ organizationId: null }];

    const rows = await this.prisma.exchangeRate.findMany({
      where: { OR: organizationFilter },
      orderBy: { date: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      rateBcv: Number(row.rateBcv),
      rateUsdt: Number(row.rateUsdt),
      rateParallel:
        row.rateParallel === null ? null : Number(row.rateParallel),
      date: row.date.toISOString(),
      source: row.source,
      persisted: true,
    }));
  }

  /**
   * Fallback rates when API is completely unavailable.
   */
  private fallbackRates(): ExchangeRateResponse {
    this.logger.warn('Using fallback exchange rates');
    return {
      success: false,
      timestamp: new Date().toISOString(),
      bcv: { usd: 795, eur: 923, effective_date: new Date().toISOString().split('T')[0] },
      bcv_next: null,
      binance: { buy: 938, sell: 911, rate: 938, buy_major: 928, sell_major: 927 },
      bybit: { buy: 935, sell: 921, rate: 935, buy_major: 940, sell_major: 920 },
    };
  }
}
