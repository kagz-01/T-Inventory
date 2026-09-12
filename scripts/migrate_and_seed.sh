#!/usr/bin/env bash
set -euo pipefail
set +H

cat > /tmp/migrate_role.sql <<'SQL'
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_new') THEN
    CREATE TYPE role_new AS ENUM ('ADMIN','MANAGER','EMPLOYEE');
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE invites ALTER COLUMN role DROP DEFAULT;

ALTER TABLE users ALTER COLUMN role TYPE role_new USING role::text::role_new;
ALTER TABLE invites ALTER COLUMN role TYPE role_new USING role::text::role_new;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
ALTER TABLE invites ALTER COLUMN role SET DEFAULT 'EMPLOYEE';

DROP TYPE IF EXISTS role;
ALTER TYPE role_new RENAME TO role;
COMMIT;
SQL

set -o allexport
source .env.local
set +o allexport

echo "DIRECT_DATABASE_URL (masked): ${DIRECT_DATABASE_URL:0:60}..."

echo "Running psql migration file /tmp/migrate_role.sql"
psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/migrate_role.sql

echo "Running seed"
npm run seed

echo "Enum range:"
psql "$DIRECT_DATABASE_URL" -c "SELECT enum_range(NULL::role);"

echo "Seeded users:"
psql "$DIRECT_DATABASE_URL" -c "SELECT email, role FROM users WHERE email IN ('boss@example.com','manager@example.com','employee1@example.com','employee2@example.com');"


echo "Done."
