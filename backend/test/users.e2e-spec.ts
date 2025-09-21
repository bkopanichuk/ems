import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let adminToken: string;
  let userToken: string;
  let testUserId: string;

  const adminUser = {
    login: 'admin',
    password: 'admin123',
    displayName: 'Admin User',
    role: 'ADMIN',
  };

  const regularUser = {
    login: 'regularuser',
    password: 'userpass123',
    displayName: 'Regular User',
    role: 'USER',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    await app.init();

    // Clean up database
    await prismaService.auditLog.deleteMany();
    await prismaService.user.deleteMany();

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 10);
    await prismaService.user.create({
      data: {
        login: adminUser.login,
        password: hashedAdminPassword,
        displayName: adminUser.displayName,
        role: 'ADMIN',
      },
    });

    // Create regular user
    const hashedUserPassword = await bcrypt.hash(regularUser.password, 10);
    const createdUser = await prismaService.user.create({
      data: {
        login: regularUser.login,
        password: hashedUserPassword,
        displayName: regularUser.displayName,
        role: 'USER',
      },
    });
    testUserId = createdUser.id;

    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        login: adminUser.login,
        password: adminUser.password,
      });
    adminToken = adminLoginResponse.body.accessToken;

    // Login as regular user
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        login: regularUser.login,
        password: regularUser.password,
      });
    userToken = userLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prismaService.auditLog.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should get all users as admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('login');
          expect(res.body[0]).toHaveProperty('displayName');
          expect(res.body[0]).toHaveProperty('role');
          expect(res.body[0]).toHaveProperty('isBlocked');
          expect(res.body[0]).not.toHaveProperty('password');
        });
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should get user by id as admin', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testUserId);
          expect(res.body.login).toBe(regularUser.login);
          expect(res.body.displayName).toBe(regularUser.displayName);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/users (POST)', () => {
    it('should create new user as admin', () => {
      const newUser = {
        login: 'newuser',
        password: 'newpass123',
        displayName: 'New User',
        role: 'USER',
      };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.login).toBe(newUser.login);
          expect(res.body.displayName).toBe(newUser.displayName);
          expect(res.body.role).toBe(newUser.role);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail with duplicate login', async () => {
      // First create a user
      const user1 = {
        login: 'duplicatetest',
        password: 'pass123',
        displayName: 'User 1',
        role: 'USER',
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user1)
        .expect(201);

      // Try to create another user with same login
      const user2 = {
        login: 'duplicatetest',
        password: 'pass456',
        displayName: 'User 2',
        role: 'USER',
      };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user2)
        .expect(409);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('login should not be empty');
          expect(res.body.message).toContain('password should not be empty');
        });
    });

    it('should be forbidden for regular users', () => {
      const newUser = {
        login: 'anotheruser',
        password: 'pass123',
        displayName: 'Another User',
        role: 'USER',
      };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUser)
        .expect(403);
    });
  });

  describe('/users/:id (PATCH)', () => {
    let updateUserId: string;

    beforeAll(async () => {
      const user = await prismaService.user.create({
        data: {
          login: 'updatetest',
          password: await bcrypt.hash('pass123', 10),
          displayName: 'Update Test User',
          role: 'USER',
        },
      });
      updateUserId = user.id;
    });

    it('should update user as admin', () => {
      return request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated Display Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.displayName).toBe('Updated Display Name');
        });
    });

    it('should update user role as admin', () => {
      return request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'ADMIN',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe('ADMIN');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'New Name',
        })
        .expect(404);
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: 'New Name',
        })
        .expect(403);
    });
  });

  describe('/users/:id (DELETE)', () => {
    let deleteUserId: string;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          login: 'deletetest' + Date.now(),
          password: await bcrypt.hash('pass123', 10),
          displayName: 'Delete Test User',
          role: 'USER',
        },
      });
      deleteUserId = user.id;
    });

    it('should soft delete user as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify user is soft deleted
      const user = await prismaService.user.findUnique({
        where: { id: deleteUserId },
      });
      expect(user.deletedAt).toBeTruthy();
    });

    it('should prevent deleting last admin', async () => {
      // Get admin user
      const adminUserDb = await prismaService.user.findFirst({
        where: { role: 'ADMIN', deletedAt: null },
      });

      // Temporarily soft-delete all other admins
      await prismaService.user.updateMany({
        where: { role: 'ADMIN', id: { not: adminUserDb.id } },
        data: { deletedAt: new Date() },
      });

      // Try to delete the last admin
      await request(app.getHttpServer())
        .delete(`/users/${adminUserDb.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Restore other admins
      await prismaService.user.updateMany({
        where: { role: 'ADMIN' },
        data: { deletedAt: null },
      });
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/users/:id/block (POST)', () => {
    let blockUserId: string;

    beforeAll(async () => {
      const user = await prismaService.user.create({
        data: {
          login: 'blocktest',
          password: await bcrypt.hash('pass123', 10),
          displayName: 'Block Test User',
          role: 'USER',
        },
      });
      blockUserId = user.id;
    });

    it('should block user as admin', async () => {
      await request(app.getHttpServer())
        .post(`/users/${blockUserId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Verify user is blocked
      const user = await prismaService.user.findUnique({
        where: { id: blockUserId },
      });
      expect(user.isBlocked).toBe(true);
    });

    it('should not allow blocking self', async () => {
      const adminUserDb = await prismaService.user.findFirst({
        where: { login: adminUser.login },
      });

      return request(app.getHttpServer())
        .post(`/users/${adminUserDb.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .post(`/users/${blockUserId}/block`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/users/:id/unblock (POST)', () => {
    let unblockUserId: string;

    beforeAll(async () => {
      const user = await prismaService.user.create({
        data: {
          login: 'unblocktest',
          password: await bcrypt.hash('pass123', 10),
          displayName: 'Unblock Test User',
          role: 'USER',
          isBlocked: true,
        },
      });
      unblockUserId = user.id;
    });

    it('should unblock user as admin', async () => {
      await request(app.getHttpServer())
        .post(`/users/${unblockUserId}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Verify user is unblocked
      const user = await prismaService.user.findUnique({
        where: { id: unblockUserId },
      });
      expect(user.isBlocked).toBe(false);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .post(`/users/${unblockUserId}/unblock`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/users/:id/role (PATCH)', () => {
    let roleUserId: string;

    beforeAll(async () => {
      const user = await prismaService.user.create({
        data: {
          login: 'roletest',
          password: await bcrypt.hash('pass123', 10),
          displayName: 'Role Test User',
          role: 'USER',
        },
      });
      roleUserId = user.id;
    });

    it('should assign admin role as admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${roleUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      // Verify role changed
      const user = await prismaService.user.findUnique({
        where: { id: roleUserId },
      });
      expect(user.role).toBe('ADMIN');
    });

    it('should assign user role as admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${roleUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' })
        .expect(200);

      // Verify role changed
      const user = await prismaService.user.findUnique({
        where: { id: roleUserId },
      });
      expect(user.role).toBe('USER');
    });

    it('should validate role enum', () => {
      return request(app.getHttpServer())
        .patch(`/users/${roleUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);
    });

    it('should be forbidden for regular users', () => {
      return request(app.getHttpServer())
        .patch(`/users/${roleUserId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });
  });
});