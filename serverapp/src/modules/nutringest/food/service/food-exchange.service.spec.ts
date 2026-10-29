import { ExchangeListService } from "./food-exchange.service";
import { normalizeSearchText } from "src/shared/helpers/search-text.util";

type Captured = { where?: any; create?: any; update?: any };

const buildHarness = (existing?: Record<string, unknown>) => {
  const captured: Captured = {};

  const repository = {
    getColumns: jest.fn(() => []),
    getFormCreate: jest.fn(() => ({})),
    getFilters: jest.fn(() => ({})),
    findMany: jest.fn(async (args: any) => {
      captured.where = args.where;
      return [];
    }),
    count: jest.fn(async () => 0),
    findDistinctCategories: jest.fn(async () => [] as string[]),
    findOne: jest.fn(async () => existing ?? null),
    create: jest.fn(async (args: any) => {
      captured.create = args.data;
      return args.data;
    }),
    update: jest.fn(async (args: any) => {
      captured.update = args.data;
      return args.data;
    }),
  };

  const service = new ExchangeListService(
    repository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, repository, captured };
};

const userSession = { permits: { list: [] } } as any;

describe("ExchangeListService — accent-insensitive food search", () => {
  it("folds the query so 'Kefir' matches the row stored as 'Kéfir'", async () => {
    const { service, captured } = buildHarness();

    await service.pagination({
      query: { q: "Kefir", limit: 10 } as any,
      userSession,
    });

    expect(captured.where).toBeDefined();
    // Both sides must go through the same normalizer, otherwise the query and
    // the stored row never agree and the match silently never happens.
    expect(captured.where.searchText).toEqual({
      contains: normalizeSearchText("Kéfir"),
      mode: "insensitive",
    });
    expect(captured.where.searchText.contains).toBe("kefir");
  });

  it("keeps the category and sub filters on their own columns", async () => {
    const { service, captured } = buildHarness();

    await service.pagination({
      query: { q: "leche", category: "LECHE", sub: "MUY BAJA" } as any,
      userSession,
    });

    expect(captured.where.category).toEqual({
      contains: "LECHE",
      mode: "insensitive",
    });
    expect(captured.where.sub).toEqual({
      contains: "MUY BAJA",
      mode: "insensitive",
    });
    // The free-text query collapses into a single folded column.
    expect(captured.where.OR).toBeUndefined();
  });

  it("returns the categories that actually exist, for the filter selector", async () => {
    const { service, repository } = buildHarness();
    repository.findDistinctCategories.mockResolvedValue([
      "CARNES",
      "FRUTAS",
      "JUGO FRUTAS",
    ]);

    const response = await service.pagination({
      query: { limit: 10 } as any,
      userSession,
    });

    // The selector used to be a hardcoded list that had drifted from the
    // table, so it could not reach every category the data actually has.
    expect(response.categories).toEqual(["CARNES", "FRUTAS", "JUGO FRUTAS"]);
  });

  it("writes the folded row text on create", async () => {
    const { service, captured } = buildHarness();

    await service.create({
      userSession,
      data: {
        name: "Kéfir",
        category: "LECHE",
        sub: "MUY BAJA EN GRASA (0 - 3 gramos grasa/ int.)",
        unity: "1 taza",
        calories: 90,
      },
    });

    expect(captured.create?.searchText).toBe(
      normalizeSearchText(
        "Kéfir",
        "LECHE",
        "MUY BAJA EN GRASA (0 - 3 gramos grasa/ int.)",
      ),
    );
    expect(captured.create?.searchText).toBe(
      "kefir leche muy baja en grasa (0 - 3 gramos grasa/ int.)",
    );
  });

  it("recomputes the folded row text from the merged row when the name changes", async () => {
    // The folded text spans name + category + sub, so an update that only
    // carries `name` must not drop the parts that stayed on the stored row.
    const { service, captured } = buildHarness({
      id: "id-1",
      name: "Kéfir",
      category: "LECHE",
      sub: "MUY BAJA EN GRASA (0 - 3 gramos grasa/ int.)",
    });

    await service.update({
      userSession,
      id: "id-1",
      data: { name: "Brócoli" },
    });

    expect(captured.update?.searchText).toBe(
      "brocoli leche muy baja en grasa (0 - 3 gramos grasa/ int.)",
    );
  });

  it("recomputes the folded row text when the category changes", async () => {
    const { service, captured } = buildHarness({
      id: "id-1",
      name: "Kefir",
      category: "LECHE",
      sub: "MUY BAJA",
    });

    await service.update({
      userSession,
      id: "id-1",
      data: { category: "ALMIDONES, CEREALES Y PANES" },
    });

    expect(captured.update?.searchText).toBe(
      normalizeSearchText(
        "Kefir",
        "ALMIDONES, CEREALES Y PANES",
        "MUY BAJA",
      ),
    );
  });

  it("leaves the folded row text untouched when the update has no text fields", async () => {
    const { service, captured, repository } = buildHarness({
      id: "id-1",
      name: "Kefir",
      category: "LECHE",
      sub: "MUY BAJA",
    });

    await service.update({
      userSession,
      id: "id-1",
      data: { unity: "2 tazas" },
    });

    expect(repository.findOne).not.toHaveBeenCalled();
    expect(captured.update?.searchText).toBeUndefined();
  });
});
