-- ────────────────────────────────────────────────────────────
-- NUTRINGEST — PATCHES DE SCHEMA FUERA DE PRISMA
-- Tablas/columnas que existen en producción pero NO están en
-- las migraciones Prisma (fueron creadas por db push / seeds).
-- Se aplican en local luego de `prisma migrate reset`.
-- ────────────────────────────────────────────────────────────

-- Tabla Condiment
CREATE TABLE IF NOT EXISTS public."Condiment" (
    id         text NOT NULL,
    name       text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Condiment_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Condiment_name_key" ON public."Condiment" USING btree (name);

-- Tabla MenuCondiment
CREATE TABLE IF NOT EXISTS public."MenuCondiment" (
    id           text NOT NULL,
    "menuId"     text NOT NULL,
    "condimentId" text NOT NULL,
    quantity     numeric(65,30),
    unit         text,
    CONSTRAINT "MenuCondiment_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuCondiment_menuId_condimentId_key" ON public."MenuCondiment" USING btree ("menuId", "condimentId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuCondiment_condimentId_fkey') THEN
        ALTER TABLE public."MenuCondiment"
            ADD CONSTRAINT "MenuCondiment_condimentId_fkey"
            FOREIGN KEY ("condimentId") REFERENCES public."Condiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuCondiment_menuId_fkey') THEN
        ALTER TABLE public."MenuCondiment"
            ADD CONSTRAINT "MenuCondiment_menuId_fkey"
            FOREIGN KEY ("menuId") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- Columna extra en Menu
ALTER TABLE public."Menu" ADD COLUMN IF NOT EXISTS "imageUrl" text;