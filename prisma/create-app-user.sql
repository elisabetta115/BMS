-- Creates "bms_app", the login the website uses instead of the master "postgres"
-- user. It can read and write rows in every table but cannot create, change or
-- drop tables, so a leaked website password can't destroy the database.
-- Schema changes (prisma/*.sql) are still run as postgres via DIRECT_URL.
-- Run once, passing the new password on the command line so it isn't stored here:
--   psql "$DIRECT_URL" -v app_password="..." -f prisma/create-app-user.sql

\set ON_ERROR_STOP on

BEGIN;

CREATE ROLE bms_app LOGIN PASSWORD :'app_password';

GRANT CONNECT ON DATABASE :"DBNAME" TO bms_app;
GRANT USAGE ON SCHEMA public TO bms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bms_app;

-- Tables added later by postgres (e.g. a new prisma/add-*.sql) get the same
-- access automatically, so the site doesn't break after a schema change.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bms_app;

COMMIT;

-- Check: app_tables should equal all_tables, and app_can_create_tables should be f.
SELECT count(*) AS all_tables,
       count(*) FILTER (WHERE has_table_privilege('bms_app', c.oid, 'SELECT')
                          AND has_table_privilege('bms_app', c.oid, 'INSERT')
                          AND has_table_privilege('bms_app', c.oid, 'UPDATE')
                          AND has_table_privilege('bms_app', c.oid, 'DELETE')) AS app_tables,
       has_schema_privilege('bms_app', 'public', 'CREATE') AS app_can_create_tables
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');
