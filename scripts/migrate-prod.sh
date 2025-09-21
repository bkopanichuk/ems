#!/bin/bash
set -e

echo "🗄️ Starting production migration..."

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Backup database before migration
echo "🔐 Creating backup before migration..."
./scripts/backup-db.sh

# Run migration in a transaction
echo "🔄 Running database migration..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Verify migration
echo "✔️ Verifying migration..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate status

echo "✅ Migration completed successfully!"
echo "💡 If issues arise, restore from backup: ./scripts/rollback.sh production [backup-file]"