# EMS Project Initialization Plan

## Overview
This plan outlines the setup of a production-grade Energy Management System with focus on 100% uptime and safe database operations during deployments.

## Architecture Strategy

### 1. Zero-Downtime Deployment Strategy
- **Blue-Green Deployment**: Run two identical production environments (blue/green)
- **Rolling Updates**: Update containers one at a time to maintain service availability
- **Health Checks**: Ensure new containers are healthy before routing traffic
- **Graceful Shutdown**: Allow existing requests to complete before container termination

### 2. Database Safety Strategy
- **Prisma Migrations**: Use Prisma's migration system with careful planning
- **Migration Locks**: Implement database-level locks to prevent concurrent migrations
- **Backward Compatibility**: Ensure all migrations are backward compatible
- **Rollback Plan**: Test rollback procedures for each migration
- **Migration Testing**: Run migrations in staging before production

## Implementation Plan

### Phase 1: Backend Project Initialization
**Priority: Critical | Timeline: Day 1**

#### 1.1 Initialize Nest.js Project
```bash
# Create backend directory and initialize Nest.js
mkdir backend && cd backend
npm i -g @nestjs/cli
nest new . --skip-git --package-manager npm

# Install required dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install passport passport-jwt passport-local
npm install @prisma/client prisma
npm install bcrypt class-validator class-transformer
npm install helmet compression

# Install dev dependencies
npm install --save-dev @types/passport-jwt @types/passport-local
npm install --save-dev @types/bcrypt @types/compression
npm install --save-dev @nestjs/testing supertest
```

#### 1.2 Project Structure
```
/EMS (root)
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── decorators/
│   │   │       └── roles.decorator.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   ├── profile/
│   │   │   ├── profile.controller.ts
│   │   │   ├── profile.service.ts
│   │   │   └── profile.module.ts
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── health/
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   ├── common/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── .env.example
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── quasar.config.js
│   └── package.json
├── docker-compose.yml (development)
├── docker-compose.prod.yml (production)
├── docker-compose.staging.yml (staging)
├── .env.development
├── .env.staging
├── .env.production
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── scripts/
│   ├── deploy.sh
│   ├── rollback.sh
│   ├── backup-db.sh
│   └── health-check.sh
├── .github/
│   └── workflows/
│       ├── test.yml
│       ├── build.yml
│       └── deploy.yml
├── PRD.md
└── README.md
```

#### 1.3 Prisma Schema Setup
```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id          String    @id @default(uuid())
  login       String    @unique
  password    String
  displayName String?
  role        Role      @default(USER)
  isBlocked   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### 1.4 Root Environment Configuration
```env
# .env.example (root directory)
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ems_dev
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Backend
BACKEND_PORT=3000
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# Admin Credentials
ADMIN_LOGIN=admin
ADMIN_PASSWORD=secure_admin_password

# Frontend
FRONTEND_PORT=9000

# CORS
CORS_ORIGIN=http://localhost:9000
```

#### 1.5 Database Initialization
```bash
# From backend directory
cd backend

# Initialize Prisma
npx prisma init
npx prisma migrate dev --name init
npx prisma generate

# Create seed script for admin user
npx prisma db seed
```

### Phase 2: Docker Infrastructure Setup
**Priority: Critical | Timeline: Day 1-2**

#### 2.1 Backend Dockerfile
```dockerfile
# backend/Dockerfile
# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY --from=development /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"
```

#### 2.2 Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost || exit 1
```

#### 2.3 Frontend Nginx Configuration
```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - always return index.html for client routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 2.4 Root Docker Compose Configuration (Development)
```yaml
# docker-compose.yml (root directory - for development)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-ems_dev}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      target: development
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret}
      ADMIN_LOGIN: ${ADMIN_LOGIN:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin123}
      CORS_ORIGIN: http://localhost:${FRONTEND_PORT:-9000}
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run start:dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "${FRONTEND_PORT:-9000}:9000"
    environment:
      API_URL: http://localhost:${BACKEND_PORT:-3000}
    command: npm run dev

volumes:
  postgres_data:
```

#### 2.5 Root Docker Compose Configuration (Production)
```yaml
# docker-compose.prod.yml (root directory - for production)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - backend-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  backend:
    build:
      context: ./backend
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_LOGIN: ${ADMIN_LOGIN}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      CORS_ORIGIN: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - backend-network
      - frontend-network
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M

  frontend:
    build:
      context: ./frontend
      target: production
    networks:
      - frontend-network
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - frontend-network
    deploy:
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '0.5'
          memory: 128M

networks:
  backend-network:
    driver: overlay
    encrypted: true
  frontend-network:
    driver: overlay

volumes:
  postgres_data:
    driver: local
```

### Phase 3: Core Backend Implementation
**Priority: High | Timeline: Day 2-3**

#### 3.1 Main Application Entry Point
```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:9000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
```

#### 3.2 Authentication Module
- JWT-based authentication
- Login with username/password (no email)
- Role-based access control (USER/ADMIN)
- Block/unblock user functionality
- Session management with refresh tokens

#### 3.3 User Management Module
- CRUD operations for users (Admin only)
- User listing with pagination
- User creation with login/password
- User deletion with cascade handling
- Role assignment
- Block/unblock functionality

#### 3.4 Profile Module
- Display name management
- Password change for users
- Profile viewing
- Admin profile restrictions

#### 3.5 Health Check Module
```typescript
// backend/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
```

### Phase 4: Database Migration Strategy
**Priority: Critical | Timeline: Day 3-4**

#### 4.1 Migration Scripts
```bash
# scripts/migrate-prod.sh
#!/bin/bash
set -e

echo "Starting production migration..."

# Backup database
./scripts/backup-db.sh

# Run migration
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify migration
docker-compose -f docker-compose.prod.yml exec backend npx prisma validate

echo "Migration completed successfully"
```

#### 4.2 Zero-Downtime Migration Strategy
1. **Expand Phase**: Add new columns/tables without removing old ones
2. **Migrate Phase**: Migrate data to new structure
3. **Contract Phase**: Remove old columns/tables after verification

#### 4.3 Database Backup Script
```bash
# scripts/backup-db.sh
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

echo "Creating database backup: ${BACKUP_FILE}"

docker-compose exec postgres pg_dump -U ${DB_USER} ${DB_NAME} > ./backups/${BACKUP_FILE}

# Keep only last 7 days of backups
find ./backups -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: ./backups/${BACKUP_FILE}"
```

### Phase 5: Deployment Pipeline
**Priority: High | Timeline: Day 4-5**

#### 5.1 Blue-Green Deployment Script
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# Load environment
source .env.production

# Build new version
echo "Building new version..."
docker-compose -f docker-compose.prod.yml build

# Tag images
docker tag ems_backend:latest ems_backend:green
docker tag ems_frontend:latest ems_frontend:green

# Deploy to green environment
echo "Deploying to green environment..."
docker-compose -f docker-compose.green.yml up -d

# Wait for health checks
echo "Waiting for health checks..."
sleep 30

# Health check
if ! ./scripts/health-check.sh green; then
  echo "Health check failed, rolling back..."
  docker-compose -f docker-compose.green.yml down
  exit 1
fi

# Switch traffic
echo "Switching traffic to green..."
./scripts/switch-traffic.sh green

# Monitor for 5 minutes
echo "Monitoring for issues (5 minutes)..."
./scripts/monitor.sh 5m

# Tag blue as backup
docker tag ems_backend:blue ems_backend:backup
docker tag ems_frontend:blue ems_frontend:backup

# Tag green as new blue
docker tag ems_backend:green ems_backend:blue
docker tag ems_frontend:green ems_frontend:blue

echo "Deployment complete!"
```

#### 5.2 Health Check Script
```bash
# scripts/health-check.sh
#!/bin/bash

ENV=${1:-blue}
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Health check passed"
    exit 0
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Health check attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying..."
  sleep 2
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
```

### Phase 6: Monitoring & Alerting
**Priority: High | Timeline: Day 5-6**

#### 6.1 Application Monitoring
- Request/response logging
- Error tracking with Sentry
- Performance metrics with Prometheus
- Database query monitoring

#### 6.2 Docker Monitoring Stack
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
```

### Phase 7: Testing Infrastructure
**Priority: Medium | Timeline: Day 6-7**

#### 7.1 Backend Test Scripts
```json
// backend/package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:integration": "jest --config ./test/jest-integration.json"
  }
}
```

#### 7.2 Frontend Test Configuration
```javascript
// frontend/quasar.config.js
module.exports = function (ctx) {
  return {
    // ... other config
    test: {
      unit: {
        runner: 'jest',
      },
      e2e: {
        runner: 'cypress',
      },
    },
  };
};
```

### Phase 8: CI/CD Configuration
**Priority: Medium | Timeline: Day 7-8**

#### 8.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run backend tests
        working-directory: ./backend
        run: |
          npm run test
          npm run test:e2e

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run frontend tests
        working-directory: ./frontend
        run: npm run test:unit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Log in to the Container registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker images
        run: |
          docker-compose -f docker-compose.prod.yml build
          docker tag ems_backend:latest ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          docker tag ems_frontend:latest ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}

  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          # SSH to staging server and deploy
          echo "Deploying to staging..."
          ./scripts/deploy-staging.sh ${{ github.sha }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          # SSH to production server and deploy
          echo "Deploying to production..."
          ./scripts/deploy-production.sh ${{ github.sha }}
```

## Success Metrics
- Zero-downtime deployments achieved
- Database migrations completed without data loss
- All automated tests passing
- Health checks reporting 100% uptime
- Rollback capability tested and verified
- Response time < 200ms for 95% of requests
- Error rate < 0.1%

## Timeline Summary
- **Day 1**: Initialize backend project, create Docker infrastructure
- **Day 2-3**: Implement core backend features (auth, users, profile)
- **Day 3-4**: Setup database migration strategy
- **Day 4-5**: Configure deployment pipeline
- **Day 5-6**: Implement monitoring and alerting
- **Day 6-7**: Setup testing infrastructure
- **Day 7-8**: Configure CI/CD

## Next Steps
1. Review and approve this plan
2. Initialize backend Nest.js project
3. Create Docker infrastructure at root level
4. Implement authentication system
5. Setup database with Prisma
6. Configure deployment pipeline
7. Test zero-downtime deployment
8. Document deployment procedures