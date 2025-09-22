# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EMS (Energy Management System) is a production-grade web application skeleton with JWT-based authentication, role-based access control, and zero-downtime deployment capabilities.

**Tech Stack:**
- Backend: Node.js + Nest.js + TypeScript + Prisma + PostgreSQL
- Frontend: Vue 3 (Quasar) + TypeScript + Composition API
- Deployment: Docker Compose (dev & prod environments)

## Common Development Commands

### Backend (from `/backend` directory)
```bash
# Development
npm run start:dev              # Start with hot reload
npm run build                   # Build for production
npm run lint                    # Run ESLint
npm run test                    # Run unit tests
npm run test:e2e               # Run E2E tests
npm run test:cov               # Generate coverage report

# Database
npm run prisma:generate        # Generate Prisma client (auto-runs after npm install)
npm run prisma:migrate         # Run migrations (dev)
npm run prisma:migrate:deploy  # Deploy migrations (prod)
npm run prisma:seed           # Seed database with admin user

# NOTE: Prisma client auto-generates:
# - After npm install (via postinstall hook)
# - On docker-compose up (runs before start:dev)
# - No manual generation needed!
```

### Frontend (from `/frontend` directory)
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run lint                   # Run ESLint
npm run format                 # Format code with Prettier
npm run test                   # Run tests (currently placeholder)
```

### Docker Operations (from root)
```bash
# Development
docker-compose up -d           # Start all services
docker-compose down            # Stop all services
docker-compose logs backend    # View backend logs
docker-compose logs frontend   # View frontend logs

# Database operations
docker-compose exec backend npx prisma migrate dev      # Run migrations
docker-compose exec backend npm run prisma:seed         # Seed database

# Production deployment
./scripts/deploy.sh production              # Deploy to production
./scripts/backup-db.sh                      # Backup database
./scripts/migrate-prod.sh                   # Run production migrations
./scripts/rollback.sh production <backup>   # Rollback database
./scripts/health-check.sh                   # Check system health
```

## Architecture Overview

### Backend Structure
- **Module-based architecture** using Nest.js decorators and dependency injection
- **Database access** via Prisma ORM with PostgreSQL
- **Authentication** using JWT tokens with refresh token rotation
- **Soft deletes** implemented on User model (deletedAt field)
- **Health checks** at `/api/health` and `/api/health/ready`

Key modules:
- `auth/` - JWT authentication with local strategy
- `users/` - User CRUD operations (Admin only)
- `profile/` - User profile management
- `database/` - Prisma service configuration
- `health/` - Health check endpoints

### Frontend Structure
- **Quasar framework** with Vue 3 Composition API
- **State management** using Pinia stores
- **Authentication** handled via axios interceptors
- **Routing** with Vue Router and auth guards

Key directories:
- `boot/` - Application initialization (axios, i18n)
- `components/` - Reusable Vue components
- `layouts/` - Application layouts
- `pages/` - Route-based page components
- `stores/` - Pinia state stores
- `router/` - Vue Router configuration

### Database Schema
Primary tables:
- `User` - Users with soft delete support (deletedAt field)
- Roles: USER, ADMIN (enum)
- Authentication uses username/password (no email field)

### API Endpoints
- Auth: `/api/auth/login`, `/api/auth/profile`
- Users (Admin): `/api/users/*` (CRUD, block/unblock, role assignment)
- Profile: `/api/profile/*` (view, update name, change password)
- Health: `/api/health`, `/api/health/ready`

### Deployment Strategy
- Blue-green deployment with health checks
- Database migrations follow expand-migrate-contract pattern
- Automatic backups before migrations
- Container health monitoring via Docker

## Testing Approach
- Backend: Jest for unit/E2E tests (`npm run test`, `npm run test:e2e`)
- Frontend: Currently uses placeholder test command
- Test scripts in `/backend/`: `test-backend.sh`, `test-soft-delete.sh`

## Default Credentials
- Admin login: `admin`
- Admin password: `admin123`

## Important Notes
- Admin user created via environment variables or seed script
- Users have `login` field (username), not email
- Soft deletes preserve data with `deletedAt` timestamp
- JWT tokens expire in 15 minutes, refresh tokens in 7 days
- All API responses follow consistent format with status/data/message