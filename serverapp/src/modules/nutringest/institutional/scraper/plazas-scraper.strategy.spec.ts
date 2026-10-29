import { PlazasScraperStrategy } from "./plazas-scraper.strategy";
import { PriceUnit } from "@prisma/client";

describe("PlazasScraperStrategy", () => {
  let strategy: PlazasScraperStrategy;

  beforeEach(() => {
    strategy = new PlazasScraperStrategy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Debe normalizar gramos a KG correctamente (E.g. 800G)", async () => {
    const mockHtml = `
      <div class="product-item-info">
        <strong class="product name product-item-name">
          <a class="product-item-link" href="#">ARROZ MARY INTEGRAL 800G</a>
        </strong>
        <span class="price-container">
          <span class="price">$ 1,59</span>
        </span>
      </div>
    `;

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const result = await strategy.scrapeFoodPrice("arroz");

    expect(result.success).toBe(true);
    expect(result.rawPrice).toBe(1.59);
    expect(result.rawUnitText).toBe("800G");
    expect(result.unit).toBe(PriceUnit.KG);
    // 1.59 / (800 / 1000) = 1.9875 -> 1.99
    expect(result.price).toBe(1.99);
  });

  it("Debe normalizar kilogramos a KG correctamente (E.g. 1.2KG)", async () => {
    const mockHtml = `
      <div class="product-item-info">
        <strong class="product name product-item-name">
          <a class="product-item-link" href="#">POLLO ENTERO KILOS 1.2KG</a>
        </strong>
        <span class="price-container">
          <span class="price">$ 4,50</span>
        </span>
      </div>
    `;

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const result = await strategy.scrapeFoodPrice("pollo");

    expect(result.success).toBe(true);
    expect(result.rawPrice).toBe(4.50);
    expect(result.rawUnitText).toBe("1.2KG");
    expect(result.unit).toBe(PriceUnit.KG);
    // 4.50 / 1.2 = 3.75
    expect(result.price).toBe(3.75);
  });

  it("Debe normalizar mililitros a LITER correctamente (E.g. 500ML)", async () => {
    const mockHtml = `
      <div class="product-item-info">
        <strong class="product name product-item-name">
          <a class="product-item-link" href="#">ACEITE VEGETAL COCO 500ML</a>
        </strong>
        <span class="price-container">
          <span class="price">$ 2,50</span>
        </span>
      </div>
    `;

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const result = await strategy.scrapeFoodPrice("aceite");

    expect(result.success).toBe(true);
    expect(result.rawPrice).toBe(2.50);
    expect(result.rawUnitText).toBe("500ML");
    expect(result.unit).toBe(PriceUnit.LITER);
    // 2.50 / (500 / 1000) = 5.00
    expect(result.price).toBe(5.00);
  });

  it("Debe manejar fallos del servidor remoto con gracia", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    const result = await strategy.scrapeFoodPrice("error");

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP error! status: 500");
  });
});
