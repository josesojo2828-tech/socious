import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";

import ExchangeListRepository from "./food-exchange.repository";

/**
 * Exchange-list repository contract, against the real database.
 *
 * T5 / L12 — `grams` must reach the client.
 *
 * The column exists since T2 and the fixture has been writing it since T4, but
 * `format()` projects fields one by one, so the value was silently dropped
 * between the database and the webapp. The UI then had nothing to render.
 *
 * Two rows exercise the projection:
 *   - "Leche descremada 1%" (pinned by the fixture) carries 240 g/cc per
 *     exchange.
 *   - The corrected catalog defines grams for every food, so the "no source
 *     measure" branch is exercised with a transient row created here instead
 *     of a catalog gap: it must come back as `null` and not as `0` or as an
 *     absent key.
 *
 * Requires the local database with `npm run seed:exchange` applied.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const prisma = hasDb ? new PrismaClient() : (null as unknown as PrismaClient);

describeDb("exchange-list repository projection", () => {
  let repository: ExchangeListRepository;

  beforeAll(() => {
    repository = new ExchangeListRepository(
      prisma as never,
      new EventEmitter2(),
      {} as never,
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const findByName = async (name: string) => {
    const rows = await repository.findMany({
      where: { name },
      skip: 0,
      take: 1,
    });
    return rows[0];
  };

  it("returns the grams stored for a food that has them", async () => {
    const row = await findByName("Leche descremada 1%");

    expect(row).toBeDefined();
    expect(row?.grams).toBe(240);
  });

  it("returns null for a food without a source measure", async () => {
    // The corrected catalog defines grams for every food, so the "no source
    // measure" branch is pinned with a transient row instead of a catalog gap.
    const name = "__projection-null-grams__";
    await prisma.foodExchangeList.upsert({
      where: { name },
      create: {
        name,
        category: "TEST",
        sub: "TEST",
        unity: "1 unidad",
        grams: null,
        calories: 0,
      },
      update: { grams: null },
    });

    try {
      const row = await findByName(name);

      expect(row).toBeDefined();
      expect(row).toHaveProperty("grams");
      expect(row?.grams).toBeNull();
    } finally {
      await prisma.foodExchangeList.deleteMany({ where: { name } });
    }
  });

  /**
   * T6 / S1 — the category selector must match the table.
   *
   * The `<option>` list was hardcoded and had drifted: it named nine values
   * while the table holds twelve, so 21 foods (FRUTAS SECAS, JUGO FRUTAS and
   * both spellings of ALMIDONES…) could not be filtered to, and AZUCARES was
   * offered with nothing behind it.
   *
   * The expectation is derived by folding every row independently, so it does
   * not reuse the same `distinct` the method runs.
   */
  it("lists exactly the categories present in the table", async () => {
    const fromMethod = await repository.findDistinctCategories();

    const rows = await prisma.foodExchangeList.findMany({
      select: { category: true },
    });
    const expected = [
      ...new Set(
        rows
          .map((row) => row.category)
          .filter((category): category is string => Boolean(category)),
      ),
    ].sort();

    // Sorted on both sides: the set is what matters, not Postgres' collation.
    expect([...fromMethod].sort()).toEqual(expected);
    expect(new Set(fromMethod).size).toBe(fromMethod.length);

    // Catalog groups come straight from the corrected Excel catalog.
    expect(fromMethod).toContain("ALMIDONES, CEREALES Y PANES");
    expect(fromMethod).toContain("FRUTAS");
    expect(fromMethod).toContain("CARNES O SUSTITUTOS");
    expect(fromMethod).toContain("GRASAS");
    expect(fromMethod).toContain("HORTALIZAS Y VEGETALES");
    expect(fromMethod).toContain("LECHE Y SUSTITUTOS");
    // No fragmented subcategories remain
    expect(fromMethod).not.toContain("FRUTAS SECAS");
    expect(fromMethod).not.toContain("JUGO FRUTAS");
    expect(fromMethod).not.toContain("CEREALES");
    expect(fromMethod).not.toContain("PANES");
    expect(fromMethod).not.toContain("TUBERCULOS");
    expect(fromMethod).not.toContain("AZUCARES");
  });
});
