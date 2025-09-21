#!/bin/bash
set -e

echo "🚀 EMS Quick Start"
echo "=================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Copy environment file if not exists
if [ ! -f .env.development ]; then
    echo "📝 Creating development environment file..."
    cp .env.example .env.development
fi

# Copy backend environment file if not exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend environment file..."
    cd backend && cp .env.example .env && cd ..
fi

# Start services
echo "🔄 Starting Docker services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec -T backend npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T backend npx prisma migrate dev --name init

# Seed database
echo "🌱 Seeding database with admin user..."
docker-compose exec -T backend npm run prisma:seed

# Show status
echo ""
echo "✅ Setup Complete!"
echo "=================="
docker-compose ps
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:9000"
echo "   Backend API: http://localhost:3000/api"
echo "   Health Check: http://localhost:3000/api/health"
echo ""
echo "👤 Default Admin Credentials:"
echo "   Login: admin"
echo "   Password: admin123"
echo ""
echo "📚 Useful Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Reset everything: docker-compose down -v"
echo ""