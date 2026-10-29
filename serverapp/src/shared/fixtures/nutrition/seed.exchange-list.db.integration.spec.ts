import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { list } from "./seed.exchange-list";

/**
 * T5 / L7 — guard de consistencia entre el fixture y la base.
 *
 * L7 encontró 15 alimentos que existen en el fixture y **nunca llegaron a la
 * base**, porque el seeder era `createMany({ skipDuplicates: true })` y esas
 * filas ya estaban sembradas con otro origen. Nadie se enteró: el seed
 * devuelve "éxito" igual.
 *
 * Este test cierra ese hueco: los nombres ÚNICOS del fixture deben ser
 * exactamente las filas de la tabla. No mira una fila puntual — mira el
 * conjunto completo — así que también atrapa el caso inverso (filas huérfanas
 * en la base que el fixture ya no conoce).
 *
 * El nombre es la clave: `name @unique`, y el seeder deduplica por nombre
 * manteniendo la primera aparición, que es la misma que `skipDuplicates`
 * deja en la base.
 *
 * Requiere la base local con el seed aplicado (`npm run seed:exchange`).
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

/** Primera aparición de cada nombre, en orden — igual que hace el seeder. */
const fixtureUniqueNames = (): Set<string> => {
  const seen = new Set<string>();
  for (const entry of list) seen.add(entry.name);
  return seen;
};

describeDb("exchange-list fixture ↔ database consistency", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("has every fixture food in the database", async () => {
    const expected = fixtureUniqueNames();
    const rows = await prisma.foodExchangeList.findMany({
      select: { name: true },
    });

    const actual = new Set(rows.map((row) => row.name));
    const missing = [...expected].filter((name) => !actual.has(name));

    expect(missing).toEqual([]);
    expect(actual.size).toBe(rows.length);
    expect(rows.length).toBe(expected.size);
  });

  it("has no database row the fixture does not know", async () => {
    const expected = fixtureUniqueNames();
    const rows = await prisma.foodExchangeList.findMany({
      select: { name: true },
    });

    const orphaned = rows
      .map((row) => row.name)
      .filter((name) => !expected.has(name));

    expect(orphaned).toEqual([]);
  });
});
