import { ExchangeMetricsService } from "./exchange-list-metrics.service";

describe("ExchangeMetricsService", () => {
  let service: ExchangeMetricsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      exchangeList: {
        findMany: jest.fn(),
      },
    };
    service = new ExchangeMetricsService(prisma);
  });

  it("returns getEmptyMetrics when nutritionistId is missing or undefined", async () => {
    const result = await service.getExchangeMetrics({});

    expect(result).toEqual({
      overview: {
        totalGroups: 0,
        totalFoodItems: 0,
        mostDiverseGroup: null,
        mostDiverseCount: 0,
        avgCalories: 0,
      },
      distribution: [],
    });
    expect(prisma.exchangeList.findMany).not.toHaveBeenCalled();
  });

  it("calculates metrics correctly when exchange lists exist", async () => {
    prisma.exchangeList.findMany.mockResolvedValue([
      {
        name: "Proteínas",
        baseKcal: 120,
        _count: { items: 5 },
      },
      {
        name: "Carbohidratos",
        baseKcal: 80,
        _count: { items: 10 },
      },
    ]);

    const result = await service.getExchangeMetrics({ nutritionistId: "nut-1" });

    expect(result.overview.totalGroups).toBe(2);
    expect(result.overview.totalFoodItems).toBe(15);
    expect(result.overview.mostDiverseGroup).toBe("Carbohidratos");
    expect(result.overview.mostDiverseCount).toBe(10);
    expect(result.overview.avgCalories).toBe(100);
    expect(result.distribution).toHaveLength(2);
  });
});
