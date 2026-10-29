import { FoodMetricsService } from "./food-metrics.service";
import { normalizeSearchText } from "src/shared/helpers/search-text.util";

/**
 * T13 / L9 — the exchange metrics search folds accents like every other
 * search over the same table.
 *
 * `getDashboardExchangeMetrics` compared the raw query against `name` and
 * `category` with Prisma's `contains`, which cannot fold the stored side.
 * Typing "corazon" found none of the 1 row named "Corazón de alcachofa" —
 * confirmed against the real database, not inferred.
 *
 * Folding only the query does not help either: `contains: "corazon"` still
 * cannot match the stored `"Corazón"`. The only column that can answer a
 * folded query is `searchText`, which stores name + category + sub already
 * normalized, and which is non-null on all 178 rows.
 */

const buildHarness = () => {
  const captured: { where?: Record<string, unknown> } = {};

  const prisma = {
    foodExchangeList: {
      count: jest.fn(async (args: { where: Record<string, unknown> }) => {
        captured.where = args.where;
        return 1;
      }),
      aggregate: jest.fn(async () => ({ _avg: { calories: 60 } })),
      groupBy: jest.fn(async () => [] as unknown[]),
    },
  };

  const service = new FoodMetricsService(prisma as never);
  return { service, prisma, captured };
};

describe("FoodMetricsService — exchange search", () => {
  it("filters through the folded searchText column", async () => {
    const { service, captured } = buildHarness();

    await service.getDashboardExchangeMetrics({
      searchQuery: "corazon de alcachofa",
    });

    expect(captured.where?.searchText).toEqual({
      contains: normalizeSearchText("corazon de alcachofa"),
      mode: "insensitive",
    });
    // The old OR over the raw columns is exactly what could not fold.
    expect(captured.where?.OR).toBeUndefined();
  });

  it("passes no filter at all when there is no query", async () => {
    const { service, captured } = buildHarness();

    await service.getDashboardExchangeMetrics();

    expect(captured.where).toEqual({});
  });
});
