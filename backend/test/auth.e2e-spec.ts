import {
  INestApplication,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, mockAuthUser, mockAdminUser } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/auth/auth.service';

// Mock bcrypt at the module level
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: any;

  beforeAll(async () => {
    app = await createTestingApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Small delay to avoid rate limiting issues in tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('/auth/login (POST) - Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue(mockAuthUser);
      prismaService.refreshToken.create.mockResolvedValue({});

      // Mock bcrypt compare to return true for correct password
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        login: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });
    });

    it('should fail with invalid credentials', async () => {
      // The MockLocalAuthGuard will handle validation
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', async () => {
      // The MockLocalAuthGuard will handle validation
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'nonexistent',
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail when user is blocked', async () => {
      // The MockLocalAuthGuard checks for blocked users
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'password123',
          isBlocked: true,
        })
        .expect(401);
    });
  });

  describe('/auth/login (POST) - Validation', () => {
    let validationApp: INestApplication;

    beforeAll(async () => {
      validationApp = await createTestingApp();
    });

    afterAll(async () => {
      await validationApp.close();
    });

    it('should validate required fields - empty body', async () => {
      await request(validationApp.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('should validate required fields - missing password', async () => {
      await request(validationApp.getHttpServer())
        .post('/auth/login')
        .send({ login: 'testuser' })
        .expect(400);
    });

    it('should validate required fields - missing login', async () => {
      await request(validationApp.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token with valid refresh token', async () => {
      const mockTokenRecord = {
        id: 'token-1',
        token: 'valid-refresh-token',
        userId: mockAuthUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: mockAuthUser,
      };

      prismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      prismaService.refreshToken.update.mockResolvedValue({});
      prismaService.refreshToken.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'valid-refresh-token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
    });

    it('should fail with invalid refresh token', async () => {
      // Mock the auth service to throw for invalid token
      const authService = app.get(AuthService);
      authService.refreshToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(401);
    });

    it('should fail with expired refresh token', async () => {
      // Mock the auth service to throw for expired token
      const authService = app.get(AuthService);
      authService.refreshToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Token expired'));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'expired-token',
        })
        .expect(401);
    });

    it('should fail with revoked refresh token', async () => {
      // Mock the auth service to throw for revoked token
      const authService = app.get(AuthService);
      authService.refreshToken = jest
        .fn()
        .mockRejectedValue(new ForbiddenException('Token revoked'));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'revoked-token',
        })
        .expect(403);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          refresh_token: 'valid-refresh-token',
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refresh_token: 'valid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('/auth/logout-all (POST)', () => {
    it('should logout from all devices', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out from all devices',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).post('/auth/logout-all').expect(401);
    });
  });
});
