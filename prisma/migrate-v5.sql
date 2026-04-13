-- ============================================================
-- Migration v5 — Run in Supabase SQL Editor
-- Adds: SocialPage model, channel field on contacts/messages
-- Safe to re-run: all statements are idempotent
-- ============================================================

-- SocialPlatform enum
DO $$ BEGIN
  CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Social pages table (Facebook / Instagram page connections)
CREATE TABLE IF NOT EXISTS "social_pages" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "platform"    "SocialPlatform" NOT NULL,
    "pageId"      TEXT NOT NULL,
    "pageName"    TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "pictureUrl"  TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_pages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_pages_userId_platform_pageId_key" UNIQUE ("userId", "platform", "pageId")
);

DO $$ BEGIN
  ALTER TABLE "social_pages"
    ADD CONSTRAINT "social_pages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add socialPageId + channel to contacts
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "socialPageId" TEXT,
  ADD COLUMN IF NOT EXISTS "channel"      "SocialPlatform";

-- Make sessionId optional on contacts (social contacts have no WA session)
ALTER TABLE "contacts" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Add socialPageId FK on contacts
DO $$ BEGIN
  ALTER TABLE "contacts"
    ADD CONSTRAINT "contacts_socialPageId_fkey"
    FOREIGN KEY ("socialPageId") REFERENCES "social_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Make sessionId optional on messages (social messages have no WA session)
ALTER TABLE "messages" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "social_pages_userId_idx" ON "social_pages"("userId");
