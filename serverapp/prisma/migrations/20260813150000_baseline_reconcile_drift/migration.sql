-- M0: Baseline reconciliation — fold prod drift into Prisma migration history
-- Items: Condiment table, MenuCondiment table, Menu.imageUrl column
-- Idempotent: safe for both fresh DB and existing prod

-- 1. Condiment table
CREATE TABLE IF NOT EXISTS "Condiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Condiment_pkey" PRIMARY KEY ("id")
);

-- Unique index on Condiment.name
CREATE UNIQUE INDEX IF NOT EXISTS "Condiment_name_key" ON "Condiment"("name");

-- 2. MenuCondiment table
CREATE TABLE IF NOT EXISTS "MenuCondiment" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "condimentId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    CONSTRAINT "MenuCondiment_pkey" PRIMARY KEY ("id")
);

-- Unique index on (menuId, condimentId)
CREATE UNIQUE INDEX IF NOT EXISTS "MenuCondiment_menuId_condimentId_key" ON "MenuCondiment"("menuId", "condimentId");

-- FK: MenuCondiment.menuId -> Menu.id (CASCADE on delete)
DO $$ BEGIN
    ALTER TABLE "MenuCondiment" ADD CONSTRAINT "MenuCondiment_menuId_fkey"
        FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- FK: MenuCondiment.condimentId -> Condiment.id (RESTRICT on delete)
DO $$ BEGIN
    ALTER TABLE "MenuCondiment" ADD CONSTRAINT "MenuCondiment_condimentId_fkey"
        FOREIGN KEY ("condimentId") REFERENCES "Condiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Menu.imageUrl column
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
