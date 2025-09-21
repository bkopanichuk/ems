#!/bin/bash
set -e

# Load environment
if [ "$1" = "production" ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  COMPOSE_FILE="docker-compose.prod.yml"
else
  export $(cat .env.development | grep -v '^#' | xargs)
  COMPOSE_FILE="docker-compose.yml"
fi

echo "🚀 Starting deployment..."

# Build new version
echo "📦 Building new version..."
docker-compose -f $COMPOSE_FILE build

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy

# Deploy services
echo "🔄 Deploying services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for health checks
echo "⏳ Waiting for health checks..."
sleep 30

# Health check
./scripts/health-check.sh

echo "✅ Deployment complete!"