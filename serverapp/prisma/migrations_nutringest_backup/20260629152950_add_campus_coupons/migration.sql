-- CreateTable
CREATE TABLE "CampusRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "graduationDate" TIMESTAMP(3) NOT NULL,
    "documentFileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampusRequest_email_key" ON "CampusRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CampusRequest_documentFileId_key" ON "CampusRequest"("documentFileId");

-- CreateIndex
CREATE UNIQUE INDEX "CampusCoupon_code_key" ON "CampusCoupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CampusCoupon_usedById_key" ON "CampusCoupon"("usedById");

-- AddForeignKey
ALTER TABLE "CampusRequest" ADD CONSTRAINT "CampusRequest_documentFileId_fkey" FOREIGN KEY ("documentFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusCoupon" ADD CONSTRAINT "CampusCoupon_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
