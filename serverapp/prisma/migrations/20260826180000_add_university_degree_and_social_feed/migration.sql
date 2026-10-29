-- Safe Enum Creation
DO $$ BEGIN
    CREATE TYPE "PostType" AS ENUM ('ARTICLE', 'CASE_STUDY', 'MENU', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Nutritionist
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "universityDegree" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "graduationYear" INTEGER;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "mppsCode" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "cndvCode" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "cndvState" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "identityCard" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "degreeFileUrl" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "licenseFileUrl" TEXT;
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Nutritionist" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- CreateTable scientific_article
CREATE TABLE IF NOT EXISTS "scientific_article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "publication_year" INTEGER NOT NULL,
    "doi" TEXT,
    "pdf_url" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "abstract" TEXT NOT NULL,
    "clinical_takeaways" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scientific_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable social_post
CREATE TABLE IF NOT EXISTS "social_post" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "post_type" "PostType" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "shared_post_id" TEXT,
    "article_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable post_comment
CREATE TABLE IF NOT EXISTS "post_comment" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable post_like
CREATE TABLE IF NOT EXISTS "post_like" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_follow
CREATE TABLE IF NOT EXISTS "user_follow" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes & Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "social_post_article_id_key" ON "social_post"("article_id");
CREATE INDEX IF NOT EXISTS "social_post_author_id_idx" ON "social_post"("author_id");
CREATE INDEX IF NOT EXISTS "social_post_post_type_idx" ON "social_post"("post_type");
CREATE INDEX IF NOT EXISTS "social_post_created_at_idx" ON "social_post"("created_at");

CREATE INDEX IF NOT EXISTS "scientific_article_category_idx" ON "scientific_article"("category");

CREATE INDEX IF NOT EXISTS "post_comment_post_id_idx" ON "post_comment"("post_id");
CREATE INDEX IF NOT EXISTS "post_comment_author_id_idx" ON "post_comment"("author_id");
CREATE INDEX IF NOT EXISTS "post_comment_parent_id_idx" ON "post_comment"("parent_id");

CREATE UNIQUE INDEX IF NOT EXISTS "post_like_post_id_user_id_key" ON "post_like"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "post_like_post_id_idx" ON "post_like"("post_id");
CREATE INDEX IF NOT EXISTS "post_like_user_id_idx" ON "post_like"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_follow_follower_id_following_id_key" ON "user_follow"("follower_id", "following_id");
CREATE INDEX IF NOT EXISTS "user_follow_follower_id_idx" ON "user_follow"("follower_id");
CREATE INDEX IF NOT EXISTS "user_follow_following_id_idx" ON "user_follow"("following_id");

-- Foreign Keys
DO $$ BEGIN
    ALTER TABLE "social_post" ADD CONSTRAINT "social_post_shared_post_id_fkey" FOREIGN KEY ("shared_post_id") REFERENCES "social_post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "social_post" ADD CONSTRAINT "social_post_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "scientific_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "social_post" ADD CONSTRAINT "social_post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "post_like" ADD CONSTRAINT "post_like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "post_like" ADD CONSTRAINT "post_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
