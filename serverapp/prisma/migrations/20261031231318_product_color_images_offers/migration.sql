-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationImage" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slogan" TEXT,
    "bannerKey" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferProduct" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "OfferProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "PresentationImage_presentationId_idx" ON "PresentationImage"("presentationId");

-- CreateIndex
CREATE INDEX "Offer_organizationId_idx" ON "Offer"("organizationId");

-- CreateIndex
CREATE INDEX "Offer_expiresAt_idx" ON "Offer"("expiresAt");

-- CreateIndex
CREATE INDEX "OfferProduct_productId_idx" ON "OfferProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferProduct_offerId_productId_key" ON "OfferProduct"("offerId", "productId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationImage" ADD CONSTRAINT "PresentationImage_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "ProductPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferProduct" ADD CONSTRAINT "OfferProduct_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferProduct" ADD CONSTRAINT "OfferProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
