# EMS - Energy Management System

## Project Overview

A modern Energy Management System built with:

* **Backend**: Node.js + Nest.js + TypeScript + Prisma + PostgreSQL
* **Frontend**: Vue 3 + Nuxt.js + shadcn/vue + TypeScript + Tailwind CSS
* **Infrastructure**: Docker + docker-compose for dev/prod environments

## Current Status ✅

**FULLY INITIALIZED AND WORKING**

* ✅ Backend: Nest.js API running on port 3001
* ✅ Frontend: Nuxt.js app running on port 3000
* ✅ Database: PostgreSQL 15.14 running on port 5432
* ✅ Docker: Full containerization with dev/prod configurations
* ✅ Build Tests: Both backend and frontend build successfully

## Quick Start

```bash
# Start development environment
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs [service_name]

# Stop services
docker-compose down
```

## Service URLs

* **Frontend**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:3001](http://localhost:3001)
* **Database**: postgresql://postgres\:password\@localhost:5432/ems\_db

## Project Structure

```
├── backend/                 # Nest.js API
│   ├── src/                # Source code
│   ├── prisma/             # Database schema & migrations
│   ├── Dockerfile          # Production dockerfile
│   ├── Dockerfile.dev      # Development dockerfile
│   └── .env                # Backend environment variables
├── frontend/               # Nuxt.js application
│   ├── components/         # Feature-Sliced Design structure
│   │   ├── shared/        # Reusable UI components
│   │   ├── entities/      # Business entities
│   │   ├── features/      # Specific features
│   │   └── widgets/       # Complex UI widgets
│   ├── assets/css/        # Tailwind CSS styles
│   ├── lib/utils.ts       # Utility functions
│   ├── Dockerfile         # Production dockerfile
│   ├── Dockerfile.dev     # Development dockerfile
│   └── .env               # Frontend environment variables
├── docker-compose.yml     # Development environment
├── docker-compose.prod.yml # Production environment
└── .env.example          # Environment template
```

## Key Configurations

### Backend Configuration

* **Port**: 3001 (configurable via PORT env var)
* **Database**: Prisma ORM with PostgreSQL
* **Environment**: See `backend/.env.example`

### Frontend Configuration

* **Framework**: Nuxt.js 4.x with Vue 3
* **UI Library**: shadcn/vue components
* **Styling**: Tailwind CSS with dark mode support
* **TypeScript**: Full TypeScript support
* **Architecture**: Feature-Sliced Design (FSD)

### Database Configuration

* **Type**: PostgreSQL 15.14
* **Database**: ems\_db
* **User**: postgres
* **Password**: password (development)

## Development Workflow

### Running Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up backend

# Restart service after changes
docker-compose restart backend
```

### Building

```bash
# Backend build test
cd backend && npm run build

# Frontend build test  
cd frontend && npm run build
```

### Environment Variables

#### Backend (.env)

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/ems_db?schema=public"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
```

#### Frontend (.env)

```
NUXT_PUBLIC_API_BASE="http://localhost:3001"
NUXT_PUBLIC_API_URL="http://localhost:3001/api"
NUXT_HOST="0.0.0.0"
NUXT_PORT=3000
```

## Docker Commands

```bash
# Development
docker-compose up -d
docker-compose down
docker-compose logs [service]
docker-compose restart [service]

# Production  
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down

# Database operations
docker exec ems-db-dev psql -U postgres -d ems_db
```

## Frontend Architecture (FSD)

The frontend follows Feature-Sliced Design:

* **shared/**: Generic reusable components and utilities
* **entities/**: Business logic and data models (user, auth)
* **features/**: Self-contained features (login, profile, user-management)
* **widgets/**: Complex UI components (header, sidebar, layout)

## Key Files & Important Notes

### Backend

* `src/main.ts`: Application entry point with port configuration
* `prisma/schema.prisma`: Database schema
* `Dockerfile.dev`: Development container configuration

### Frontend

* `nuxt.config.ts`: Nuxt configuration with Tailwind
* `tailwind.config.js`: Tailwind CSS configuration with shadcn theme
* `components.json`: shadcn/vue configuration
* `lib/utils.ts`: Utility functions for shadcn

### Docker

* `docker-compose.yml`: Development environment with hot reload
* `docker-compose.prod.yml`: Production environment with optimizations

## Testing Status

* ✅ Backend builds successfully (`npm run build`)
* ✅ Frontend builds successfully (`npm run build`)
* ✅ All containers start and run properly
* ✅ API responds correctly (Hello World endpoint)
* ✅ Database accepts connections
* ✅ Frontend serves pages (HTTP 200)

## Production Deployment

```bash
# Copy environment template
cp .env.example .env.prod

# Edit production values
nano .env.prod

# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Backend Issues

* Check logs: `docker-compose logs backend`
* Verify port configuration in `src/main.ts`
* Ensure DATABASE\_URL is correct

### Frontend Issues

* Check logs: `docker-compose logs frontend`
* Verify Tailwind CSS configuration
* Check Nuxt build process

### Database Issues

* Check connection: `docker exec ems-db-dev pg_isready -U postgres`
* Connect to DB: `docker exec ems-db-dev psql -U postgres -d ems_db`

## Next Steps for Development

1. **Database Schema**: Define user/auth models in Prisma
2. **Authentication**: Implement JWT-based auth system
3. **API Endpoints**: Create CRUD operations for user management
4. **Frontend Components**: Build login, dashboard, and user management UI
5. **Integration**: Connect frontend to backend APIs

## Architecture Decisions

* **Environment Variables**: All configuration through env vars for 12-factor compliance
* **Containerization**: Full Docker setup for consistent dev/prod environments
* **Port Binding**: Backend binds to 0.0.0.0 for container networking
* **FSD Structure**: Organized frontend code for scalability
* **shadcn/vue**: Modern, accessible UI components with Tailwind

---

*Last Updated: Project initialization complete - all services running and tested*
