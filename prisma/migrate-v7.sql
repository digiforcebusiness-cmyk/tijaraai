-- ============================================================
-- Migration v7 — Run in Supabase SQL Editor
-- Adds: GOOGLESHEETS to IntegrationType enum
-- Adds: flows table
-- Safe to re-run
-- ============================================================

-- Add GOOGLESHEETS enum value
DO $$ BEGIN
  ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'GOOGLESHEETS';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Create flows table
CREATE TABLE IF NOT EXISTS "flows" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "trigger"       TEXT NOT NULL,
  "triggerConfig" JSONB,
  "actions"       JSONB NOT NULL DEFAULT '[]',
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt"     TIMESTAMP(3),
  "runCount"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "flows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "flows_userId_idx" ON "flows"("userId");
