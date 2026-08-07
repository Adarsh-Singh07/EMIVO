#!/bin/bash
# Restore Production DB to local environment
# Requires: rclone, pg_restore/psql

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file_name.sql.gz>"
  echo "Example: $0 backup_20260807T120000Z.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
LOCAL_DIR="/tmp/db_restores"
LOCAL_DB_URL=${LOCAL_DATABASE_URL:-"postgres://postgres:postgres@localhost:5432/emivo_dev"}

mkdir -p "$LOCAL_DIR"

echo "Downloading ${BACKUP_FILE} from R2..."
rclone copy "r2:emivo-db-backups/production/${BACKUP_FILE}" "$LOCAL_DIR"

echo "Restoring database locally..."
gunzip -c "${LOCAL_DIR}/${BACKUP_FILE}" | psql "$LOCAL_DB_URL"

echo "Cleaning up..."
rm "${LOCAL_DIR}/${BACKUP_FILE}"

echo "Restore of ${BACKUP_FILE} complete."
