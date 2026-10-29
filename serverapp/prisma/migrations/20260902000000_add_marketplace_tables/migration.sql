-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('COURSE', 'EBOOK', 'TEMPLATE', 'WEBINAR');

-- CreateTable
CREATE TABLE "CampaignPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "designs" INTEGER NOT NULL DEFAULT 0,
    "videos" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "socialMedia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPlan_name_key" ON "CampaignPlan"("name");

-- CreateTable
CREATE TABLE "MarketCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketCategory_name_key" ON "MarketCategory"("name");

-- CreateTable
CREATE TABLE "MarketProduct" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "coverUrl" TEXT,
    "previewUrl" TEXT,
    "tags" TEXT[],
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MarketProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketProduct_sellerId_idx" ON "MarketProduct"("sellerId");

-- CreateIndex
CREATE INDEX "MarketProduct_categoryId_idx" ON "MarketProduct"("categoryId");

-- CreateIndex
CREATE INDEX "MarketProduct_status_idx" ON "MarketProduct"("status");

-- AddForeignKey
ALTER TABLE "MarketProduct" ADD CONSTRAINT "MarketProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketProduct" ADD CONSTRAINT "MarketProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MarketCampaign" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketCampaign_sellerId_idx" ON "MarketCampaign"("sellerId");

-- CreateIndex
CREATE INDEX "MarketCampaign_productId_idx" ON "MarketCampaign"("productId");

-- CreateIndex
CREATE INDEX "MarketCampaign_status_idx" ON "MarketCampaign"("status");

-- AddForeignKey
ALTER TABLE "MarketCampaign" ADD CONSTRAINT "MarketCampaign_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketCampaign" ADD CONSTRAINT "MarketCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketCampaign" ADD CONSTRAINT "MarketCampaign_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CampaignPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MarketReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "response" TEXT,
    "responseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketReview_productId_buyerId_key" ON "MarketReview"("productId", "buyerId");

-- CreateIndex
CREATE INDEX "MarketReview_productId_idx" ON "MarketReview"("productId");

-- AddForeignKey
ALTER TABLE "MarketReview" ADD CONSTRAINT "MarketReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketReview" ADD CONSTRAINT "MarketReview_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "WalletPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletPayment_userId_idx" ON "WalletPayment"("userId");

-- CreateIndex
CREATE INDEX "WalletPayment_status_idx" ON "WalletPayment"("status");

-- AddForeignKey
ALTER TABLE "WalletPayment" ADD CONSTRAINT "WalletPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
