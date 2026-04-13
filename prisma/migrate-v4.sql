-- ============================================================
-- Migration v4 — Run in Supabase SQL Editor
-- Adds: Products table for AI product knowledge base
-- Safe to re-run: all statements are idempotent
-- ============================================================

CREATE TABLE IF NOT EXISTS "products" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "platform"          TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "description"       TEXT,
    "price"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comparePrice"      DOUBLE PRECISION,
    "sku"               TEXT,
    "stock"             INTEGER,
    "imageUrl"          TEXT,
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_userId_platform_externalProductId_key"
        UNIQUE ("userId", "platform", "externalProductId")
);

DO $$ BEGIN
  ALTER TABLE "products"
    ADD CONSTRAINT "products_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
