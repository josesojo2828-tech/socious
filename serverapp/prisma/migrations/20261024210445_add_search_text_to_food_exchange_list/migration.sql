-- AlterTable
ALTER TABLE "FoodExchangeList" ADD COLUMN     "searchText" TEXT;

-- Backfill for rows that already exist. Mirrors normalizeSearchText() in
-- src/shared/helpers/search-text.util.ts: join the row parts with a single
-- space, fold the Spanish accents, lowercase, collapse whitespace, trim.
-- The seeder rewrites every row through the TypeScript helper afterwards, so
-- this only covers the window between applying the migration and reseeding.
UPDATE "FoodExchangeList"
SET "searchText" = trim(regexp_replace(
  lower(translate(
    coalesce("name", '') || ' ' || coalesce("category", '') || ' ' || coalesce("sub", ''),
    'áéíóúüñÁÉÍÓÚÜÑ',
    'aeiouunAEIOUUN'
  )),
  '\s+', ' ', 'g'
));
