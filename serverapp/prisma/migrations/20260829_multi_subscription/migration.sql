-- CreateTable: Create Organization table (prerequisite for foreign keys)
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "logoUrl" TEXT,
    "maxSeats" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create OrganizationMember table
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'NUTRITIONIST',
    "colorHex" TEXT NOT NULL DEFAULT '#4F46E5',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on organizationId + userId
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex: Indexes for OrganizationMember
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex: Unique invitation token
CREATE UNIQUE INDEX "OrganizationMember_invitationToken_key" ON "OrganizationMember"("invitationToken");

-- AddForeignKey: OrganizationMember -> Organization
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: OrganizationMember -> User
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add organizationId and cascade fields to Subscription
ALTER TABLE "Subscription" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "readOnlyEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "canceledAt" TIMESTAMP(3);

-- CreateIndex: Add index on organizationId
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- AddForeignKey: Subscription -> Organization
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraint (only after verifying no duplicates)
-- ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_organizationId_key" UNIQUE ("userId", "organizationId");
