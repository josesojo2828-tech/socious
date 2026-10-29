-- AlterTable
ALTER TABLE "ExchangeList" ADD COLUMN     "imported_from_id" TEXT,
ADD COLUMN     "imported_from_type" TEXT,
ADD COLUMN     "isCommunity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "imported_from_id" TEXT,
ADD COLUMN     "imported_from_type" TEXT,
ADD COLUMN     "isCommunity" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "community_metadata" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "tags" TEXT[],
    "import_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_metadata_entity_type_idx" ON "community_metadata"("entity_type");

-- CreateIndex
CREATE INDEX "community_metadata_author_id_idx" ON "community_metadata"("author_id");

-- CreateIndex
CREATE INDEX "community_metadata_entity_type_published_at_idx" ON "community_metadata"("entity_type", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_metadata_entity_type_entity_id_key" ON "community_metadata"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "user_permission_user_id_idx" ON "user_permission"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_user_id_permission_key" ON "user_permission"("user_id", "permission");

-- CreateIndex
CREATE INDEX "ExchangeList_isCommunity_idx" ON "ExchangeList"("isCommunity");

-- CreateIndex
CREATE INDEX "ExchangeList_imported_from_id_idx" ON "ExchangeList"("imported_from_id");

-- CreateIndex
CREATE INDEX "Menu_isCommunity_idx" ON "Menu"("isCommunity");

-- CreateIndex
CREATE INDEX "Menu_imported_from_id_idx" ON "Menu"("imported_from_id");

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_imported_from_id_fkey" FOREIGN KEY ("imported_from_id") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeList" ADD CONSTRAINT "ExchangeList_imported_from_id_fkey" FOREIGN KEY ("imported_from_id") REFERENCES "ExchangeList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_metadata" ADD CONSTRAINT "community_metadata_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
