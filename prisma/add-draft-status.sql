-- Adds micro_credentials.published: false for a draft, which only people who
-- can edit it see (in the Admin Panel) until an admin publishes it. The
-- content API (/api/content) creates drafts. Every existing micro-credential
-- stays published.
-- Run as postgres BEFORE deploying the code that uses it; safe to run more than once:
--   psql "$DIRECT_URL" -f prisma/add-draft-status.sql

ALTER TABLE "micro_credentials" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true;
