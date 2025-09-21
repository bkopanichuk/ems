import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, mockAuthUser } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Profile (e2e)', () => {
  let app: INestApplication;
  let prismaService: any;

  beforeAll(async () => {
    app = await createTestingApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/profile (GET)', () => {
    it('should return user profile', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: mockAuthUser.id,
        login: mockAuthUser.login,
        displayName: mockAuthUser.displayName,
        role: mockAuthUser.role,
        createdAt: mockAuthUser.createdAt,
        updatedAt: mockAuthUser.updatedAt,
      });

      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toMatchObject({
        login: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/profile')
        .expect(401);
    });
  });

  describe('/profile (PATCH)', () => {
    it('should update display name', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        displayName: 'Updated Name',
      });

      const response = await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          displayName: 'Updated Name',
        })
        .expect(200);

      expect(response.body.displayName).toBe('Updated Name');
    });

    it('should validate display name length', async () => {
      await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          displayName: 'a', // Too short
        })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          displayName: 'a'.repeat(101), // Too long
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch('/profile')
        .send({
          displayName: 'Updated Name',
        })
        .expect(401);
    });
  });

  describe('/profile/change-password (POST)', () => {
    it('should change password successfully', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);

      // Mock bcrypt for password validation
      jest.spyOn(bcrypt, 'compare').mockImplementation((pass, hash) => {
        if (pass === 'oldPassword123') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword');

      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        password: 'newHashedPassword',
      });

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          oldPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(201);
    });

    it('should fail with incorrect old password', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);

      // Mock bcrypt to return false for wrong password
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          oldPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        })
        .expect(400);
    });

    it('should validate password requirements', async () => {
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          oldPassword: 'oldPassword123',
          newPassword: 'short', // Too short
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          oldPassword: 'oldPassword123',
          newPassword: 'a'.repeat(129), // Too long
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .send({
          oldPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(401);
    });

    it('should not allow admin to change password', async () => {
      const adminUser = { ...mockAuthUser, role: 'ADMIN' };
      prismaService.user.findFirst.mockResolvedValue(adminUser);

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          oldPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(403);
    });
  });
});