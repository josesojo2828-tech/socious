-- CreateTable
CREATE TABLE "post_bookmark" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_bookmark_post_id_user_id_key" ON "post_bookmark"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "post_bookmark_post_id_idx" ON "post_bookmark"("post_id");

-- CreateIndex
CREATE INDEX "post_bookmark_user_id_idx" ON "post_bookmark"("user_id");

-- AddForeignKey
ALTER TABLE "post_bookmark" ADD CONSTRAINT "post_bookmark_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_bookmark" ADD CONSTRAINT "post_bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
