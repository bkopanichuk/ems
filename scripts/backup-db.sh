#!/bin/bash
set -e

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

echo "🔐 Creating database backup: ${BACKUP_FILE}"

# Create database backup
docker-compose exec -T postgres pg_dump -U ${DB_USER:-postgres} ${DB_NAME:-ems_dev} > ./backups/${BACKUP_FILE}

# Compress the backup
gzip ./backups/${BACKUP_FILE}

echo "✅ Backup completed: ./backups/${BACKUP_FILE}.gz"

# Keep only last 7 days of backups
find ./backups -name "backup_*.sql.gz" -mtime +7 -delete
echo "🧹 Cleaned up old backups (keeping last 7 days)"