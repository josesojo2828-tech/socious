import { Injectable } from "@nestjs/common";
import { PriceUnit } from "@prisma/client";
import { PriceResult, ScraperStrategy } from "./scraper.strategy";

interface ScrapedProduct {
  name: string;
  price: number;
}

@Injectable()
export class PlazasScraperStrategy implements ScraperStrategy {
  readonly providerId = "PLAZAS";

  private readonly MAX_ATTEMPTS = 3;
  private readonly BASE_DELAY_MS = 500;
  private readonly MAX_DELAY_MS = 2000;
  private readonly JITTER_MS = 500;
  private readonly REQUEST_TIMEOUT_MS = 20000;
  private readonly MIN_SIMILARITY_THRESHOLD = 0.35;

  // Fingerprint de un Chrome 126 real (ventana, escritorio). El sitio
  // valleaarriba.elplazas.com está detrás de Cloudflare: sin estos headers
  // el datacenter de Render recibe 403 por scoring de bot.
  private readonly CHROME_HEADERS: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "es-VE,es;q=0.9,en-US;q=0.8,en;q=0.7",
    // Nota: se omite "zstd" en Accept-Encoding porque undici (fetch de Node)
    // no descomprime zstd y el texto llegaría corrupto.
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-CH-UA":
      '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Referer: "https://vallearriba.elplazas.com/",
    "Cache-Control": "no-cache",
  };

  private readonly STOPWORDS = new Set([
    "de",
    "la",
    "el",
    "los",
    "las",
    "del",
    "y",
    "en",
    "a",
    "al",
    "con",
    "por",
    "para",
    "un",
    "una",
    "unos",
    "unas",
    "e",
    "o",
    "u",
    "que",
    "su",
    "sus",
  ]);

  async scrapeFoodPrice(foodName: string): Promise<PriceResult> {
    const url = `https://vallearriba.elplazas.com/catalogsearch/result/?q=${encodeURIComponent(
      foodName
    )}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        return this.failure(url, `HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Regex para extraer bloques de productos en Magento
      const productRegex =
        /<strong class="product name product-item-name">[\s\S]*?<a class="product-item-link"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="price"[^>]*>([^<]+)/gi;

      const products: Array<ScrapedProduct> = [];
      let match: RegExpExecArray | null;

      while ((match = productRegex.exec(html)) !== null) {
        const name = match[1].trim().replace(/\s+/g, " ");
        const priceRaw = match[2].trim();

        // Limpiar y parsear precio: "$ 1,59" -> 1.59
        const priceClean = priceRaw.replace("$", "").replace(",", ".").trim();
        const priceVal = parseFloat(priceClean);

        if (!isNaN(priceVal)) {
          products.push({ name, price: priceVal });
        }
      }

      if (products.length === 0) {
        return this.failure(
          url,
          "No se encontraron productos coincidentes en el sitio de Plaza's."
        );
      }

      // Relevancia: en lugar de tomar ciegamente products[0], puntuar cada
      // resultado por similitud de nombre con la búsqueda. Sin un mínimo de
      // coincidencia no escribimos un precio falso (fix del "batch destructivo").
      const bestMatch = this.pickBestMatch(foodName, products);
      if (!bestMatch) {
        return this.failure(
          url,
          `No se encontró un producto que coincida con '${foodName}'`
        );
      }

      // Lógica de Normalización de Unidades
      let normalizedPrice = bestMatch.price;
      let priceUnit: PriceUnit = PriceUnit.UNIT;
      let rawUnitText = "UNIT";

      const nameUpper = bestMatch.name.toUpperCase();

      // 1. Validar gramos
      const gramMatch = nameUpper.match(/(\d+(?:\.\d+)?)\s*(G|GR|GRAMOS|GRS)\b/);
      // 2. Validar kilogramos
      const kgMatch = nameUpper.match(/(\d+(?:\.\d+)?)\s*(KG|KILO|KILOS)\b/);
      // 3. Validar mililitros
      const mlMatch = nameUpper.match(/(\d+(?:\.\d+)?)\s*(ML|CC)\b/);
      // 4. Validar litros
      const lMatch = nameUpper.match(
        /(\d+(?:\.\d+)?)\s*(L|LITRO|LITROS|LITER)\b/
      );

      if (gramMatch) {
        const grams = parseFloat(gramMatch[1]);
        if (grams > 0) {
          const factor = grams / 1000;
          normalizedPrice = bestMatch.price / factor;
          priceUnit = PriceUnit.KG;
          rawUnitText = `${grams}G`;
        }
      } else if (kgMatch) {
        const kg = parseFloat(kgMatch[1]);
        if (kg > 0) {
          normalizedPrice = bestMatch.price / kg;
          priceUnit = PriceUnit.KG;
          rawUnitText = `${kg}KG`;
        }
      } else if (mlMatch) {
        const ml = parseFloat(mlMatch[1]);
        if (ml > 0) {
          const factor = ml / 1000;
          normalizedPrice = bestMatch.price / factor;
          priceUnit = PriceUnit.LITER;
          rawUnitText = `${ml}ML`;
        }
      } else if (lMatch) {
        const l = parseFloat(lMatch[1]);
        if (l > 0) {
          normalizedPrice = bestMatch.price / l;
          priceUnit = PriceUnit.LITER;
          rawUnitText = `${l}L`;
        }
      }

      // Redondear precio normalizado
      normalizedPrice = parseFloat(normalizedPrice.toFixed(2));

      return {
        price: normalizedPrice,
        unit: priceUnit,
        rawPrice: bestMatch.price,
        rawUnitText,
        url,
        success: true,
      };
    } catch (e: any) {
      return this.failure(
        url,
        e.message || "Error desconocido durante el raspado."
      );
    }
  }

  private failure(url: string, error: string): PriceResult {
    return {
      price: 0,
      unit: PriceUnit.UNIT,
      rawPrice: 0,
      rawUnitText: "N/A",
      url,
      success: false,
      error,
    };
  }

  /**
   * Fetch con timeout explícito + hasta 3 intentos con backoff exponencial y
   * jitter. Reintenta en 403/429/5xx y en errores de red/timeout. Los 4xx no
   * retryables (p.ej. 404) se devuelven tal cual, sin reintentar.
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError = "HTTP error! status: 0";

    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      let response: Response | null = null;

      try {
        response = await this.fetchOnce(url);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          lastError = `Timeout del request tras ${this.REQUEST_TIMEOUT_MS}ms`;
        } else {
          lastError = err?.message || "Error de red durante el raspado.";
        }
      }

      if (response) {
        if (response.ok) {
          return response;
        }

        lastError = `HTTP error! status: ${response.status}`;
        const retryable =
          response.status === 403 ||
          response.status === 429 ||
          response.status >= 500;

        if (!retryable) {
          return response;
        }
      }

      if (attempt < this.MAX_ATTEMPTS) {
        await this.backoff(attempt);
      }
    }

    throw new Error(lastError);
  }

  private async fetchOnce(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT_MS
    );

    try {
      return await fetch(url, {
        headers: this.CHROME_HEADERS,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async backoff(attempt: number): Promise<void> {
    // 500ms, 1000ms, ... con tope de 2000ms + jitter aleatorio
    const baseDelay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, attempt - 1),
      this.MAX_DELAY_MS
    );
    const jitter = Math.floor(Math.random() * this.JITTER_MS);
    await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
  }

  /**
   * Selecciona el producto con mayor similitud de nombre contra la búsqueda.
   * Devuelve null si ninguno supera el umbral mínimo.
   */
  private pickBestMatch(
    query: string,
    products: ScrapedProduct[]
  ): ScrapedProduct | null {
    let best: ScrapedProduct | null = null;
    let bestScore = 0;

    for (const product of products) {
      const score = this.similarityScore(query, product.name);
      if (score > bestScore) {
        bestScore = score;
        best = product;
      }
    }

    return best && bestScore >= this.MIN_SIMILARITY_THRESHOLD ? best : null;
  }

  /**
   * Puntaje de relevancia en [0,1] entre la búsqueda y el nombre del producto:
   *  - 0.55 si el nombre contiene la búsqueda completa como substring
   *  - 0.30 por fracción de tokens de la búsqueda presentes en el nombre
   *    (filtra stopwords en español: de/el/la/...)
   *  - 0.15 por similitud Levenshtein media entre tokens de búsqueda y nombre
   */
  private similarityScore(query: string, productName: string): number {
    const q = this.normalizeText(query);
    const p = this.normalizeText(productName);
    if (!q || !p) return 0;

    let score = 0;

    if (p.includes(q)) {
      score += 0.55;
    }

    const qTokens = q
      .split(" ")
      .filter((t) => !this.STOPWORDS.has(t) && t.length > 1);
    const pTokens = new Set(p.split(" "));

    if (qTokens.length > 0) {
      const found = qTokens.filter((t) => pTokens.has(t)).length;
      score += (found / qTokens.length) * 0.3;
    }

    const qAll = q.split(" ").filter((t) => t.length > 0);
    const pAll = Array.from(pTokens);

    if (qAll.length > 0 && pAll.length > 0) {
      const bestSims = qAll.map((t) =>
        pAll.reduce(
          (best, pt) =>
            Math.max(
              best,
              1 - this.levenshtein(t, pt) / Math.max(t.length, pt.length)
            ),
          0
        )
      );
      const avg = bestSims.reduce((s, v) => s + v, 0) / bestSims.length;
      score += avg * 0.15;
    }

    return score;
  }

  /** Normaliza: minúsculas, sin acentos, solo alfanuméricos y espacios. */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const prev = new Array<number>(n + 1);
    const curr = new Array<number>(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost
        );
      }
      for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }

    return prev[n];
  }
}