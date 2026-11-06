-- CreateTable
CREATE TABLE "Tutorial" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT,
    "youtubeUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "series" TEXT NOT NULL DEFAULT 'primeros-pasos',
    "duration" TEXT,
    "code" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tutorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tutorial_youtubeId_key" ON "Tutorial"("youtubeId");

-- CreateIndex
CREATE INDEX "Tutorial_published_sortOrder_idx" ON "Tutorial"("published", "sortOrder");
