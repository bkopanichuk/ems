import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, mockAuthUser, mockAdminUser } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

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

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue(mockAuthUser);
      prismaService.refreshToken.create.mockResolvedValue({});

      // Mock bcrypt compare to return true for correct password
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'password123',
        })
        .expect(201);

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
      prismaService.user.findUnique.mockResolvedValue(mockAuthUser);

      // Mock bcrypt compare to return false for wrong password
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'nonexistent',
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail when user is blocked', async () => {
      const blockedUser = { ...mockAuthUser, isBlocked: true };
      prismaService.user.findUnique.mockResolvedValue(blockedUser);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'password123',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'testuser' })
        .expect(400);

      await request(app.getHttpServer())
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
          refreshToken: 'valid-refresh-token',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
    });

    it('should fail with invalid refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should fail with expired refresh token', async () => {
      const expiredToken = {
        id: 'token-1',
        token: 'expired-token',
        userId: mockAuthUser.id,
        expiresAt: new Date(Date.now() - 86400000), // Expired
        revokedAt: null,
        user: mockAuthUser,
      };

      prismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'expired-token',
        })
        .expect(401);
    });

    it('should fail with revoked refresh token', async () => {
      const revokedToken = {
        id: 'token-1',
        token: 'revoked-token',
        userId: mockAuthUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(), // Revoked
        user: mockAuthUser,
      };

      prismaService.refreshToken.findUnique.mockResolvedValue(revokedToken);
      prismaService.refreshToken.updateMany.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'revoked-token',
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
          refreshToken: 'valid-refresh-token',
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken: 'valid-refresh-token',
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
        .expect(201);

      expect(response.body).toEqual({
        message: 'Logged out from all devices',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .expect(401);
    });
  });
});