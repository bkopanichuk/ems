import { INestApplication, UnauthorizedException, ForbiddenException } from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, mockAuthUser } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';
import { ProfileService } from '../src/profile/profile.service';

// Mock bcrypt at module level
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

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
      const profileService = app.get(ProfileService);
      profileService.changePassword = jest.fn().mockResolvedValue({
        message: 'Password changed successfully',
      });

      const response = await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(201);
    });

    it('should fail with incorrect old password', async () => {
      const profileService = app.get(ProfileService);
      profileService.changePassword = jest.fn().mockRejectedValue(
        new UnauthorizedException('Current password is incorrect')
      );

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        })
        .expect(401);
    });

    it('should validate password requirements', async () => {
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'short', // Too short
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'a'.repeat(129), // Too long
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(401);
    });

    it('should not allow admin to change password', async () => {
      const profileService = app.get(ProfileService);
      profileService.changePassword = jest.fn().mockRejectedValue(
        new ForbiddenException('Administrators cannot change passwords via this endpoint')
      );

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', 'Bearer admin-token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        })
        .expect(403);
    });
  });
});