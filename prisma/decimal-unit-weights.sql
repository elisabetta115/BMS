-- Lets unit weights be fractions of a percent, like Open edX grading: 50% of the
-- grade shared by 9 exercises is 5.5555…% each. Whole-number weights forced the
-- importer to round, which made COSS MC01 add up to 102%.
-- Run once, as postgres, BEFORE deploying the code that goes with it:
--   psql "$DIRECT_URL" -f prisma/decimal-unit-weights.sql
-- Safe to run more than once.

BEGIN;

ALTER TABLE "credential_units" ALTER COLUMN "weight" TYPE DOUBLE PRECISION;

-- COSS MC01 (Carbon Neutrality and ESG) was imported with rounded weights: its
-- 9 exercises at 6% and its final exam at 48%. Its grading policy gives the
-- exercises 50% shared equally and the final exam 50%. Fixed in place so
-- learners keep their progress: re-importing the course, or saving it in the
-- admin, recreates its units and erases learners' progress in it.
UPDATE "credential_units" u
SET "weight" = CASE WHEN u."weight" = 48 THEN 50 ELSE 50.0 / 9 END
FROM "credential_subsections" ss
JOIN "credential_sections" s ON s."id" = ss."section_id"
JOIN "micro_credentials" c ON c."id" = s."credential_id"
WHERE u."subsection_id" = ss."id"
  AND c."code" = 'MC01' AND c."project" = 'COSS'
  AND u."type" = 'QUIZ' AND u."weight" IN (6, 48);

COMMIT;

-- Check: COSS MC01 should now total 100.
SELECT c."code", c."project", round(sum(u."weight")::numeric, 4) AS total_weight
FROM "credential_units" u
JOIN "credential_subsections" ss ON ss."id" = u."subsection_id"
JOIN "credential_sections" s ON s."id" = ss."section_id"
JOIN "micro_credentials" c ON c."id" = s."credential_id"
WHERE c."code" = 'MC01' AND c."project" = 'COSS'
GROUP BY c."code", c."project";
