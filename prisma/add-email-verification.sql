-- Email confirmation, password reset and email-change links.
-- Adds users.email_verified_at (sign-in is blocked while it is null) and the
-- email_tokens table that holds one-time links (only their SHA-256 hash).
-- Run as postgres BEFORE deploying the code that uses them; safe to run more than once:
--   psql "$DIRECT_URL" -f prisma/add-email-verification.sql

DO $$
BEGIN
  CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Accounts that exist before this change count as confirmed, so nobody is
-- locked out. Done only when the column is first added: on a re-run it must
-- not confirm people who registered since and haven't clicked their link.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
    UPDATE "users" SET "email_verified_at" = CURRENT_TIMESTAMP;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "email_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "new_email" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_tokens_token_hash_key" ON "email_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "email_tokens_user_id_idx" ON "email_tokens"("user_id");

-- The website's login (prisma/create-app-user.sql) gets this table through its
-- default privileges; granted explicitly too in case that script ran later.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bms_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "email_tokens" TO bms_app;
  END IF;
END $$;
