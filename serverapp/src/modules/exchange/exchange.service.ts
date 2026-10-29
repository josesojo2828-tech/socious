import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  ExchangeRateResponse,
  ExchangeRateCache,
  ConversionResult,
} from '../../shared/types/exchange.types';

const EXCHANGE_API_URL =
  'https://backend-cambiofrito.ramirezicode.com.ve/api/rates/all';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private cache: ExchangeRateCache | null = null;

  constructor(private readonly httpService: HttpService) {}

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
