-- AlterTable
ALTER TABLE "UserActivityLog" ADD COLUMN     "metadata" JSONB DEFAULT '{}';

-- CreateIndex
CREATE INDEX "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserActivityLog_createdAt_idx" ON "UserActivityLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserActivityLog_action_idx" ON "UserActivityLog"("action");
