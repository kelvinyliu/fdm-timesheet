#!/bin/bash

set -e

DB_NAME="fdm_timesheet"
SCHEMA_FILE="$(dirname "$0")/../src/db/schema.sql"

echo "Setting up database: $DB_NAME"

# Create database (ignore error if it already exists)
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists, skipping creation."

# Run schema
sudo -u postgres psql -d "$DB_NAME" < "$SCHEMA_FILE"

echo "Done."
