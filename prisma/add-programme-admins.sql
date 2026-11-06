-- Programme admins: learners a site admin has put in charge of one
-- micro-programme. In the Admin Panel they can edit that programme and its
-- micro-credentials, and nothing else.
-- Run as postgres BEFORE deploying the code that uses it; safe to run more than once:
--   psql "$DIRECT_URL" -f prisma/add-programme-admins.sql

CREATE TABLE IF NOT EXISTS "programme_admins" (
    "user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programme_admins_pkey" PRIMARY KEY ("user_id","programme_id"),
    CONSTRAINT "programme_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "programme_admins_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "micro_programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "programme_admins_programme_id_idx" ON "programme_admins"("programme_id");

-- The website's login (prisma/create-app-user.sql) gets this table through its
-- default privileges; granted explicitly too in case that script ran later.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bms_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "programme_admins" TO bms_app;
  END IF;
END $$;
