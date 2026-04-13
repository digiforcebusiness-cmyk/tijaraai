-- ============================================================
-- Migration v6 — Run in Supabase SQL Editor
-- Adds: YOUCAN and LIGHTFUNNELS to IntegrationType enum
-- Safe to re-run
-- ============================================================

DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'YOUCAN';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'LIGHTFUNNELS';
EXCEPTION WHEN others THEN NULL;
END $$;
