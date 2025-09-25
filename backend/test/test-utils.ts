import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { ProfileService } from '../src/profile/profile.service';
import { UsersService } from '../src/users/users.service';
import { InvertersService } from '../src/inverters/inverters.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../src/auth/guards/local-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';

// Mock guards
class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers.authorization) {
      // Mock different users based on token
      if (req.headers.authorization.includes('admin')) {
        req.user = { id: 'admin-user-id', role: 'ADMIN', login: 'admin' };
      } else {
        req.user = { id: 'test-user-id', role: 'USER', login: 'testuser' };
      }
      return true;
    }
    // Throw proper 401 for missing authorization
    throw new UnauthorizedException();
  }
}

class MockLocalAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    const { login, password } = req.body;

    // Validate that login and password are provided
    if (!login || !password) {
      const messages: string[] = [];
      if (!login) messages.push('login should not be empty');
      if (!password) messages.push('password should not be empty');
      throw new BadRequestException(messages);
    }

    // Check for blocked user
    if (login === 'testuser' && req.body.isBlocked) {
      throw new UnauthorizedException();
    }

    // Valid logins
    if (login === 'testuser' && password === 'password123') {
      req.user = mockAuthUser;
      return true;
    } else if (login === 'admin' && password === 'adminpass') {
      req.user = mockAdminUser;
      return true;
    }

    // Invalid credentials
    throw new UnauthorizedException();
  }
}

export function createMockInvertersService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

export function createTestingApp(): Promise<INestApplication> {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(createMockPrismaService())
    .overrideProvider(AuthService)
    .useValue(createMockAuthService())
    .overrideProvider(ProfileService)
    .useValue(createMockProfileService())
    .overrideProvider(UsersService)
    .useValue(createMockUsersService())
    .overrideProvider(InvertersService)
    .useValue(createMockInvertersService())
    .overrideGuard(JwtAuthGuard)
    .useClass(MockJwtAuthGuard)
    .overrideGuard(LocalAuthGuard)
    .useClass(MockLocalAuthGuard)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(APP_GUARD)
    .useValue([])
    .compile()
    .then((moduleFixture) => {
      const app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
        }),
      );
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

export function createMockAuthService() {
  return {
    validateUser: jest
      .fn()
      .mockImplementation((login: string, password: string) => {
        if (login === 'testuser' && password === 'password123') {
          return mockAuthUser;
        }
        if (login === 'admin' && password === 'adminpass') {
          return mockAdminUser;
        }
        return null;
      }),
    login: jest.fn().mockImplementation((user: any) => ({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role,
      },
    })),
    refreshToken: jest.fn().mockImplementation(() => ({
      access_token: 'new-mock-access-token',
      refresh_token: 'new-mock-refresh-token',
      token_type: 'Bearer',
    })),
    logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
    logoutAll: jest
      .fn()
      .mockResolvedValue({ message: 'Logged out from all devices' }),
    getProfile: jest.fn().mockImplementation((userId: string) => {
      if (userId === 'test-user-id') return mockAuthUser;
      if (userId === 'admin-user-id') return mockAdminUser;
      return null;
    }),
    getActiveSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue({ message: 'Session revoked' }),
  };
}

export function createMockProfileService() {
  return {
    getProfile: jest.fn().mockImplementation((userId: string) => {
      if (userId === 'test-user-id') {
        return {
          id: mockAuthUser.id,
          login: mockAuthUser.login,
          displayName: mockAuthUser.displayName,
          role: mockAuthUser.role,
          createdAt: mockAuthUser.createdAt,
          updatedAt: mockAuthUser.updatedAt,
        };
      }
      if (userId === 'admin-user-id') {
        return {
          id: mockAdminUser.id,
          login: mockAdminUser.login,
          displayName: mockAdminUser.displayName,
          role: mockAdminUser.role,
          createdAt: mockAdminUser.createdAt,
          updatedAt: mockAdminUser.updatedAt,
        };
      }
      return null;
    }),
    updateProfile: jest.fn().mockImplementation((userId: string, data: any) => {
      // Validate display name length
      if (
        data.displayName &&
        (data.displayName.length < 2 || data.displayName.length > 100)
      ) {
        throw new BadRequestException(
          'Display name must be between 2 and 100 characters',
        );
      }
      return Promise.resolve({
        id: userId === 'admin-user-id' ? mockAdminUser.id : mockAuthUser.id,
        login:
          userId === 'admin-user-id' ? mockAdminUser.login : mockAuthUser.login,
        displayName:
          data.displayName ||
          (userId === 'admin-user-id'
            ? mockAdminUser.displayName
            : mockAuthUser.displayName),
        role:
          userId === 'admin-user-id' ? mockAdminUser.role : mockAuthUser.role,
        createdAt:
          userId === 'admin-user-id'
            ? mockAdminUser.createdAt
            : mockAuthUser.createdAt,
        updatedAt: new Date(),
      });
    }),
    changePassword: jest
      .fn()
      .mockResolvedValue({ message: 'Password changed successfully' }),
  };
}

export function createMockUsersService() {
  return {
    findAll: jest.fn().mockImplementation((query: any) => {
      const page = parseInt(query?.page) || 1;
      const limit = parseInt(query?.limit) || 10;
      const total = 10; // Mock total count
      const lastPage = Math.ceil(total / limit);

      // Mock pagination - return empty for page 2 with limit 5
      if (page === 2 && limit === 5) {
        return Promise.resolve({
          data: [],
          meta: {
            total: 10,
            page: 2,
            lastPage: 2,
            limit: 5,
          },
        });
      }

      return Promise.resolve({
        data: [mockAuthUser, mockAdminUser],
        meta: {
          total: 2,
          page: 1,
          lastPage: 1,
          limit: 10,
        },
      });
    }),
    findOne: jest.fn().mockImplementation((id: string) => {
      if (id === mockAuthUser.id) return Promise.resolve(mockAuthUser);
      if (id === mockAdminUser.id) return Promise.resolve(mockAdminUser);
      // Throw NotFoundException for non-existent users
      throw new NotFoundException(`User with ID ${id} not found`);
    }),
    create: jest.fn().mockImplementation((data: any) => {
      // Validate required fields
      if (!data.login || !data.password || !data.displayName) {
        throw new BadRequestException('Missing required fields');
      }
      // Check for existing user
      if (data.login === 'existinguser') {
        throw new ConflictException('User with this login already exists');
      }
      return Promise.resolve({
        id: 'new-user-id',
        ...data,
        password: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    update: jest.fn().mockImplementation((id: string, data: any) => ({
      ...mockAuthUser,
      ...data,
      id,
      updatedAt: new Date(),
    })),
    assignRole: jest.fn().mockImplementation((id: string, role: string) => {
      // Validate role
      if (!['USER', 'ADMIN'].includes(role)) {
        throw new BadRequestException('Invalid role value');
      }
      return Promise.resolve({
        ...mockAuthUser,
        id,
        role,
        updatedAt: new Date(),
      });
    }),
    blockUser: jest.fn().mockImplementation((id: string) => ({
      ...mockAuthUser,
      id,
      isBlocked: true,
      updatedAt: new Date(),
    })),
    unblockUser: jest.fn().mockImplementation((id: string) => ({
      ...mockAuthUser,
      id,
      isBlocked: false,
      updatedAt: new Date(),
    })),
    remove: jest.fn().mockImplementation((id: string) => {
      if (id !== mockAuthUser.id && id !== mockAdminUser.id) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return Promise.resolve({ message: 'User deleted successfully' });
    }),
    restoreUser: jest.fn().mockImplementation((id: string) => ({
      ...mockAuthUser,
      id,
      deletedAt: null,
      updatedAt: new Date(),
    })),
    forceDelete: jest
      .fn()
      .mockResolvedValue({ message: 'User permanently deleted' }),
  };
}

export async function createAuthToken(
  app: INestApplication,
  user = mockAuthUser,
): Promise<string> {
  // Mock a valid JWT token for testing
  return 'Bearer mock-jwt-token';
}
