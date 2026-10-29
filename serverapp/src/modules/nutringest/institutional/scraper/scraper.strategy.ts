import { PriceUnit } from "@prisma/client";

export interface PriceResult {
  price: number; // Precio unitario normalizado
  unit: PriceUnit; // KG, LITER, UNIT
  rawPrice: number; // Precio original de la publicación
  rawUnitText: string; // E.g. "800G", "1KG", "1L"
  url: string;
  success: boolean;
  error?: string;
}

export interface ScraperStrategy {
  providerId: string;
  scrapeFoodPrice(foodName: string): Promise<PriceResult>;
}
