-- ============================================================
-- Migration v8 — Run in Supabase SQL Editor
-- Adds: FACEBOOK, INSTAGRAM, TIKTOK to IntegrationType enum
-- Safe to re-run
-- ============================================================

DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'FACEBOOK';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'INSTAGRAM';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'TIKTOK';
EXCEPTION WHEN others THEN NULL;
END $$;
