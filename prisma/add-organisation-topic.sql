-- Adds micro_credentials.organisation (university shown at the top of cards and
-- pages) and micro_credentials.topic (catalogue "Topic" filter).
-- Additive and safe to run more than once:
--   psql "$DIRECT_URL" -f prisma/add-organisation-topic.sql

ALTER TABLE "micro_credentials" ADD COLUMN IF NOT EXISTS "organisation" TEXT;
ALTER TABLE "micro_credentials" ADD COLUMN IF NOT EXISTS "topic" TEXT;

-- Backfill organisation for credentials imported before this column existed:
-- the importer stored "Author(s), University" in developed_by, so take the part
-- after the last comma, dropping any " | subtitle" ("BMS" → "BMS",
-- "Prof. X, Università …" → "Università …").
UPDATE "micro_credentials"
SET "organisation" = btrim(regexp_replace(regexp_replace("developed_by", '^.*,', ''), '\s*\|.*$', ''))
WHERE "organisation" IS NULL AND "developed_by" IS NOT NULL AND btrim("developed_by") <> '';

-- Some exports give an Open edX code there ("TUC"); swap codes for full names
-- (same list as src/data/organisations.ts).
UPDATE "micro_credentials"
SET "organisation" = CASE upper("organisation")
    WHEN '3OC' THEN 'Three O''Clock'
    WHEN 'CECOLAB' THEN 'Collaborative Laboratory towards Circular Economy'
    WHEN 'COSS' THEN 'Convergence and Open Sharing System (COSS)'
    WHEN 'CREARA' THEN 'CREARA Consultores SL'
    WHEN 'DTU' THEN 'Technical University of Denmark'
    WHEN 'EPTA' THEN 'EPTA PRIME S.R.L'
    WHEN 'HU' THEN 'Halmstad University'
    WHEN 'INCOMA' THEN 'International Consulting and Mobility Agency S.R.L.'
    WHEN 'INCOMA_EELI' THEN 'Koundouraki - Rodopoulou O.E.'
    WHEN 'LEI' THEN 'Lietuvos Energetikos Institutas'
    WHEN 'NUIM' THEN 'National University of Ireland Maynooth'
    WHEN 'STUBA' THEN 'Slovenska Technicka Univerzita V Bratislave'
    WHEN 'TUC' THEN 'Polytechneio Kritis'
    WHEN 'UCOI' THEN 'University of Coimbra'
    WHEN 'UGA' THEN 'Université Grenoble Alpes'
    WHEN 'UNICAMP' THEN 'Università Degli Studi Della Campania Luigi Vanvitelli'
    WHEN 'UNIGE' THEN 'Università di Genova'
    WHEN 'UNISS' THEN 'Università degli studi di Sassari'
    WHEN 'UNIPAR' THEN 'Università degli Studi di Napoli Parthenope'
    WHEN 'UNIPARTHENOPE' THEN 'Università degli Studi di Napoli Parthenope'
    WHEN 'UPV' THEN 'Universitat Politècnica de València'
    WHEN 'VMU' THEN 'Vytauto Didziojo Universitetas'
    ELSE "organisation"
  END
WHERE upper("organisation") IN ('3OC', 'CECOLAB', 'COSS', 'CREARA', 'DTU', 'EPTA', 'HU', 'INCOMA', 'INCOMA_EELI', 'LEI', 'NUIM', 'STUBA', 'TUC', 'UCOI', 'UGA', 'UNICAMP', 'UNIGE', 'UNISS', 'UNIPAR', 'UNIPARTHENOPE', 'UPV', 'VMU');
