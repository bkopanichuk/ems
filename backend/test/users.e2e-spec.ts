import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, mockAuthUser, mockAdminUser } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: any;

  beforeAll(async () => {
    app = await createTestingApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should get all users as admin', async () => {
      const mockUsers = [mockAdminUser, mockAuthUser];
      prismaService.user.findMany.mockResolvedValue(mockUsers);
      prismaService.user.count.mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        total: 2,
        page: 1,
        lastPage: 1,
      });
    });

    it('should support pagination', async () => {
      // Override the service mock for this specific test
      const usersService = app.get(UsersService);
      usersService.findAll = jest.fn().mockResolvedValue({
        data: [],
        meta: {
          total: 10,
          page: 2,
          lastPage: 2,
          limit: 5,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/users?page=2&limit=5')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body.meta).toMatchObject({
        total: 10,
        page: 2,
        lastPage: 2,
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('should require admin role', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer mock-user-token')
        .expect(403);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should get user by id as admin', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: mockAuthUser.id,
        login: mockAuthUser.login,
        displayName: mockAuthUser.displayName,
        role: mockAuthUser.role,
        isBlocked: mockAuthUser.isBlocked,
        createdAt: mockAuthUser.createdAt,
        updatedAt: mockAuthUser.updatedAt,
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${mockAuthUser.id}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockAuthUser.id,
        login: mockAuthUser.login,
        displayName: mockAuthUser.displayName,
        role: mockAuthUser.role,
      });
    });

    it('should return 404 for non-existent user', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(404);
    });
  });

  describe('/users (POST)', () => {
    it('should create a new user as admin', async () => {
      const newUser = {
        login: 'newuser',
        password: 'Password123!',
        displayName: 'New User',
        role: 'USER',
      };

      prismaService.user.findFirst.mockResolvedValue(null); // No existing user
      prismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        ...newUser,
        isBlocked: false,
        createdAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(newUser)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'new-user-id',
        login: newUser.login,
        displayName: newUser.displayName,
        role: newUser.role,
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail if login already exists', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          login: 'existinguser',
          password: 'Password123!',
          displayName: 'Duplicate User',
          role: 'USER',
        })
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ login: 'test' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ login: 'test', password: 'pass' })
        .expect(400);
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update user as admin', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        displayName: 'Updated Name',
      });

      const response = await request(app.getHttpServer())
        .patch(`/users/${mockAuthUser.id}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ displayName: 'Updated Name' })
        .expect(200);

      expect(response.body.displayName).toBe('Updated Name');
    });

    it('should update user role', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        role: 'ADMIN',
      });

      const response = await request(app.getHttpServer())
        .patch(`/users/${mockAuthUser.id}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.role).toBe('ADMIN');
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should soft delete user as admin', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        deletedAt: new Date(),
      });

      await request(app.getHttpServer())
        .delete(`/users/${mockAuthUser.id}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);
    });

    it('should return 404 for non-existent user', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/non-existent-id')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(404);
    });
  });

  describe('/users/:id/block (POST)', () => {
    it('should block user as admin', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        isBlocked: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${mockAuthUser.id}/block`)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(201);

      expect(response.body.isBlocked).toBe(true);
    });
  });

  describe('/users/:id/unblock (POST)', () => {
    it('should unblock user as admin', async () => {
      const blockedUser = { ...mockAuthUser, isBlocked: true };
      prismaService.user.findFirst.mockResolvedValue(blockedUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        isBlocked: false,
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${mockAuthUser.id}/unblock`)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(201);

      expect(response.body.isBlocked).toBe(false);
    });
  });

  describe('/users/:id/role (PATCH)', () => {
    it('should assign role to user as admin', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockAuthUser);
      prismaService.user.update.mockResolvedValue({
        ...mockAuthUser,
        role: 'ADMIN',
      });

      const response = await request(app.getHttpServer())
        .patch(`/users/${mockAuthUser.id}/role`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.role).toBe('ADMIN');
    });

    it('should validate role value', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${mockAuthUser.id}/role`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ role: 'INVALID_ROLE' })
        .expect(400);
    });
  });
});