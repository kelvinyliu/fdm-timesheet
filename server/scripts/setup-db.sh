#!/bin/bash

set -e

DB_NAME="fdm_timesheet"
SCHEMA_FILE="$(dirname "$0")/../src/db/schema.sql"
POSTGRES_RUNNER=(sudo -u postgres)

echo "Setting up database: $DB_NAME"

db_exists() {
  "${POSTGRES_RUNNER[@]}" psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1
}

if db_exists; then
  echo "Database already exists, dropping and recreating it."
  "${POSTGRES_RUNNER[@]}" psql -v ON_ERROR_STOP=1 -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
  "
  "${POSTGRES_RUNNER[@]}" psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE \"$DB_NAME\";"
fi

"${POSTGRES_RUNNER[@]}" psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"$DB_NAME\";"
"${POSTGRES_RUNNER[@]}" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" < "$SCHEMA_FILE"

echo "Done."
