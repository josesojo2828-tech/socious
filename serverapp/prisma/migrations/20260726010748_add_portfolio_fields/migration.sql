-- AlterTable
ALTER TABLE "Nutritionist" ADD COLUMN     "about" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "config" JSONB,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "services" JSONB,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "template" TEXT DEFAULT 'default';

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
