-- New certificate layout: the BoostMySkills logo, heading, learner name, two
-- editable project texts and the course title are stamped as one centred block
-- inside a content box (top/bottom/width in % of the page).
-- Additive and safe to run more than once:
--   psql "$DIRECT_URL" -f prisma/certificate-text-layout.sql
-- The old name_x … title_max_width columns are no longer read; they are left in
-- place so the previous deploy keeps working until this one is live.

ALTER TABLE "project_certificates" ADD COLUMN IF NOT EXISTS "intro_text" TEXT NOT NULL DEFAULT '';
ALTER TABLE "project_certificates" ADD COLUMN IF NOT EXISTS "closing_text" TEXT NOT NULL DEFAULT '';
ALTER TABLE "project_certificates" ADD COLUMN IF NOT EXISTS "content_top" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "project_certificates" ADD COLUMN IF NOT EXISTS "content_bottom" DOUBLE PRECISION NOT NULL DEFAULT 70;
ALTER TABLE "project_certificates" ADD COLUMN IF NOT EXISTS "content_width" DOUBLE PRECISION NOT NULL DEFAULT 64;

-- Text above the course title, same wording for every project
-- (matches defaultIntroText in src/lib/certificate.ts).
UPDATE "project_certificates"
SET "intro_text" = 'successfully completed, received a passing grade, and was awarded this ' || "project" || ' Certificate of Completion in'
WHERE "intro_text" = '';

-- Text below the course title names each project's funders; only SHERLOCK's is
-- known here, the others are filled in from Admin → Certificates.
UPDATE "project_certificates"
SET "closing_text" = 'a course of study offered by SHERLOCK, an online learning initiative funded by the European Union, and supported by the United Nations Institute for Training & Research (UNITAR)'
WHERE "closing_text" = '' AND upper("project") = 'SHERLOCK';
