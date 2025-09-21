# EMS - Energy Management System

A production-grade web application skeleton with 100% uptime capability and safe database migrations.

## Tech Stack

- **Backend**: Node.js, Nest.js, TypeScript, Prisma, PostgreSQL
- **Frontend**: Vue 3 (Quasar), TypeScript, Composition API
- **Deployment**: Docker, Docker Compose
- **CI/CD**: GitHub Actions

## Features

- JWT-based authentication (login/password, no email)
- Role-based access control (USER/ADMIN)
- User management (Admin only)
- Profile management
- Health checks and monitoring
- Zero-downtime deployments
- Safe database migrations with rollback capability

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL (handled by Docker)

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd EMS
```

2. Copy environment files:
```bash
cp .env.example .env.development
```

3. Start the development environment:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
docker-compose exec backend npx prisma migrate dev
```

5. Seed the database with admin user:
```bash
docker-compose exec backend npm run prisma:seed
```

6. Access the application:
- Frontend: http://localhost:9000
- Backend API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

### Default Credentials

- **Admin Login**: admin
- **Admin Password**: admin123

## Production Deployment

### Initial Setup

1. Set up production environment variables:
```bash
cp .env.example .env.production
# Edit .env.production with secure values
```

2. Build and deploy:
```bash
./scripts/deploy.sh production
```

### Zero-Downtime Deployment

The system supports zero-downtime deployments using:
- Blue-green deployment strategy
- Rolling updates with health checks
- Graceful shutdown handling
- Database migration safety checks

Deploy new version:
```bash
./scripts/deploy.sh production
```

### Database Migrations

#### Safe Migration Process

1. Create backup before migration:
```bash
./scripts/backup-db.sh
```

2. Run production migration:
```bash
./scripts/migrate-prod.sh
```

3. If issues arise, rollback:
```bash
./scripts/rollback.sh production ./backups/backup_TIMESTAMP.sql.gz
```

#### Migration Strategy

1. **Expand Phase**: Add new columns/tables without removing old ones
2. **Migrate Phase**: Migrate data to new structure
3. **Contract Phase**: Remove old columns/tables after verification

## Project Structure

```
EMS/
├── backend/                # Nest.js backend application
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management module
│   │   ├── profile/       # Profile management module
│   │   ├── health/        # Health check module
│   │   └── database/      # Database/Prisma module
│   ├── prisma/            # Database schema and migrations
│   └── Dockerfile
├── frontend/              # Quasar frontend application
│   ├── src/
│   └── Dockerfile
├── nginx/                 # Load balancer configuration
├── scripts/               # Deployment and maintenance scripts
│   ├── deploy.sh         # Main deployment script
│   ├── backup-db.sh      # Database backup script
│   ├── rollback.sh       # Rollback script
│   ├── migrate-prod.sh   # Production migration script
│   └── health-check.sh   # Health check script
├── docker-compose.yml     # Development environment
├── docker-compose.prod.yml # Production environment
└── .github/workflows/     # CI/CD pipelines

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/block` - Block user
- `POST /api/users/:id/unblock` - Unblock user
- `PATCH /api/users/:id/role` - Assign role to user

### Profile
- `GET /api/profile` - Get own profile
- `PATCH /api/profile` - Update display name
- `POST /api/profile/change-password` - Change password (Users only)

### Health
- `GET /api/health` - Basic health check
- `GET /api/health/ready` - Readiness probe with detailed info

## Monitoring

The application includes comprehensive monitoring:

- Health checks at `/api/health`
- Readiness checks at `/api/health/ready`
- Database connectivity monitoring
- Memory usage tracking
- Container health checks in Docker

## Security Features

- Helmet.js for security headers
- CORS configuration
- JWT authentication
- Password hashing with bcrypt
- Input validation
- SQL injection prevention via Prisma
- Rate limiting ready (nginx)

## Testing

### Backend Tests
```bash
cd backend
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npm run test:cov       # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test:unit      # Unit tests
npm run lint           # Linting
```

## Backup and Recovery

### Create Manual Backup
```bash
./scripts/backup-db.sh
```

### Restore from Backup
```bash
./scripts/rollback.sh production ./backups/backup_TIMESTAMP.sql.gz
```

Backups are automatically:
- Created before migrations
- Compressed with gzip
- Retained for 7 days
- Stored in `./backups/` directory

## Troubleshooting

### Check Service Status
```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### Health Check
```bash
./scripts/health-check.sh
```

### Database Connection Issues
```bash
docker-compose exec backend npx prisma migrate status
docker-compose exec postgres psql -U postgres -d ems_dev
```

### Reset Development Environment
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend npm run prisma:seed
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Create pull request
5. CI/CD will automatically test and deploy

## License

Private