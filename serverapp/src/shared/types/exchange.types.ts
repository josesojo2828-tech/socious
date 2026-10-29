export interface BcvRate {
  usd: number;
  eur: number;
  effective_date: string;
}

export interface BinanceRate {
  buy: number;
  sell: number;
  rate: number;
  buy_major: number;
  sell_major: number;
}

export interface ExchangeRateResponse {
  success: boolean;
  timestamp: string;
  bcv: BcvRate;
  bcv_next: BcvRate | null;
  binance: BinanceRate;
  bybit: BinanceRate;
}

export interface ExchangeRateCache {
  data: ExchangeRateResponse;
  fetchedAt: number;
}

export interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  converted: number;
  timestamp: string;
}
