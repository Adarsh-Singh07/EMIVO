#!/bin/bash
# Backup Production DB to Cloudflare R2
# Requires: pg_dump, rclone, gzip

set -e

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
LOCAL_DIR="/tmp/db_backups"

mkdir -p "$LOCAL_DIR"

echo "Dumping database..."
pg_dump "$DATABASE_URL" | gzip > "${LOCAL_DIR}/${BACKUP_FILE}"

echo "Uploading to R2..."
rclone copy "${LOCAL_DIR}/${BACKUP_FILE}" r2:emivo-db-backups/production/

echo "Cleaning up local file..."
rm "${LOCAL_DIR}/${BACKUP_FILE}"

echo "Backup ${BACKUP_FILE} complete."
