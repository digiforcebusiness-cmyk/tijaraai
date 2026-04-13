-- ============================================================
-- Migration v3 — Run in Supabase SQL Editor
-- Adds: Integrations table, external order tracking fields
-- Safe to re-run: all statements are idempotent
-- ============================================================

-- Platform enum
DO $$ BEGIN
  CREATE TYPE "IntegrationType" AS ENUM ('SHOPIFY', 'WOOCOMMERCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Integrations table (stores encrypted credentials per user per platform)
CREATE TABLE IF NOT EXISTS "integrations" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "type"         "IntegrationType" NOT NULL,
    "shopDomain"   TEXT,
    "accessToken"  TEXT,
    "siteUrl"      TEXT,
    "consumerKey"  TEXT,
    "consumerSecret" TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integrations_userId_type_key" UNIQUE ("userId", "type")
);

DO $$ BEGIN
  ALTER TABLE "integrations"
    ADD CONSTRAINT "integrations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add external order tracking to orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "platform"         TEXT,
  ADD COLUMN IF NOT EXISTS "externalOrderId"  TEXT,
  ADD COLUMN IF NOT EXISTS "externalOrderUrl" TEXT;
