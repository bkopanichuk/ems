#!/bin/bash
set -e

echo "⚠️  Starting rollback procedure..."

# Load environment
if [ "$1" = "production" ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  COMPOSE_FILE="docker-compose.prod.yml"
else
  export $(cat .env.development | grep -v '^#' | xargs)
  COMPOSE_FILE="docker-compose.yml"
fi

# Check if backup file is provided
if [ -z "$2" ]; then
  echo "❌ Please provide a backup file to restore"
  echo "Usage: ./scripts/rollback.sh [environment] [backup-file]"
  echo "Example: ./scripts/rollback.sh production ./backups/backup_20240101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE=$2

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "📦 Restoring from backup: $BACKUP_FILE"

# Stop services (except database)
echo "🛑 Stopping services..."
docker-compose -f $COMPOSE_FILE stop backend frontend nginx

# Restore database
echo "🗄️ Restoring database..."
gunzip -c $BACKUP_FILE | docker-compose -f $COMPOSE_FILE exec -T postgres psql -U ${DB_USER:-postgres} ${DB_NAME:-ems_dev}

# Start services
echo "🚀 Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for health checks
echo "⏳ Waiting for health checks..."
sleep 30

# Health check
./scripts/health-check.sh

echo "✅ Rollback complete!"