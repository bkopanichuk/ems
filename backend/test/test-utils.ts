import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as request from 'supertest';

export function createTestingApp(): Promise<INestApplication> {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(createMockPrismaService())
    .compile()
    .then(moduleFixture => {
      const app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
      }));
      return app.init();
    });
}

export function createMockPrismaService() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((fn) => fn(this)),
    $queryRaw: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
}

export const mockAuthUser = {
  id: 'test-user-id',
  login: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  password: '$2b$10$K7L1OJ0TfmCiRlXvlQVvpe/nnvJRNPCJ8xGVxKta3TTL5pUcax3vy', // 'password123'
  isBlocked: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshToken: null,
  refreshTokenExpiresAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  loginCount: 0,
};

export const mockAdminUser = {
  ...mockAuthUser,
  id: 'admin-user-id',
  login: 'admin',
  displayName: 'Admin User',
  role: 'ADMIN',
};

export async function createAuthToken(app: INestApplication, user = mockAuthUser): Promise<string> {
  // Mock a valid JWT token for testing
  return 'Bearer mock-jwt-token';
}