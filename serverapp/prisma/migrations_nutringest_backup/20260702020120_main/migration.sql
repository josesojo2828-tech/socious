-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "colorTheme" JSONB,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
