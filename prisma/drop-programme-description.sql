-- Drops micro_programmes.description: it was never shown to learners and the
-- admin form no longer has the field. Any text stored there is deleted.
-- Run AFTER deploying the code that no longer reads the column:
--   psql "$DIRECT_URL" -f prisma/drop-programme-description.sql

ALTER TABLE "micro_programmes" DROP COLUMN IF EXISTS "description";
