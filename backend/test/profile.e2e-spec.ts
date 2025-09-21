import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Profile (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userToken: string;
  let adminToken: string;

  const regularUser = {
    login: 'profileuser',
    password: 'userpass123',
    displayName: 'Profile Test User',
    role: 'USER',
  };

  const adminUser = {
    login: 'profileadmin',
    password: 'admin123',
    displayName: 'Profile Admin User',
    role: 'ADMIN',
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

    // Create regular user
    const hashedUserPassword = await bcrypt.hash(regularUser.password, 10);
    await prismaService.user.create({
      data: {
        login: regularUser.login,
        password: hashedUserPassword,
        displayName: regularUser.displayName,
        role: 'USER',
      },
    });

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

    // Login as regular user
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        login: regularUser.login,
        password: regularUser.password,
      });
    userToken = userLoginResponse.body.accessToken;

    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        login: adminUser.login,
        password: adminUser.password,
      });
    adminToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prismaService.auditLog.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  describe('/profile (GET)', () => {
    it('should get user profile', () => {
      return request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.login).toBe(regularUser.login);
          expect(res.body.displayName).toBe(regularUser.displayName);
          expect(res.body.role).toBe(regularUser.role);
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should get admin profile', () => {
      return request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.login).toBe(adminUser.login);
          expect(res.body.role).toBe('ADMIN');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/profile').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/profile (PATCH)', () => {
    it('should update display name for user', () => {
      return request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: 'Updated User Display Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.displayName).toBe('Updated User Display Name');
        });
    });

    it('should update display name for admin', () => {
      return request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated Admin Display Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.displayName).toBe('Updated Admin Display Name');
        });
    });

    it('should handle empty update', () => {
      return request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(200);
    });

    it('should validate display name length', () => {
      return request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: 'a'.repeat(256), // Too long
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch('/profile')
        .send({
          displayName: 'New Name',
        })
        .expect(401);
    });
  });

  describe('/profile/change-password (POST)', () => {
    it('should change password for regular user', async () => {
      const newPassword = 'newpass456';

      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: regularUser.password,
          newPassword: newPassword,
        })
        .expect(201);

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: regularUser.login,
          password: newPassword,
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Update token for subsequent tests
      userToken = loginResponse.body.accessToken;

      // Change back to original password for other tests
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: newPassword,
          newPassword: regularUser.password,
        })
        .expect(201);

      // Get new token
      const finalLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: regularUser.login,
          password: regularUser.password,
        });
      userToken = finalLoginResponse.body.accessToken;
    });

    it('should fail with incorrect old password', () => {
      return request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: 'wrongpassword',
          newPassword: 'newpass123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Incorrect old password');
        });
    });

    it('should not allow admin to change password', () => {
      return request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          oldPassword: adminUser.password,
          newPassword: 'newadminpass',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Admins cannot change password');
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('oldPassword should not be empty');
          expect(res.body.message).toContain('newPassword should not be empty');
        });
    });

    it('should validate password length', () => {
      return request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: regularUser.password,
          newPassword: '123', // Too short
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('newPassword must be longer than or equal to 6');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/profile/change-password')
        .send({
          oldPassword: 'oldpass',
          newPassword: 'newpass',
        })
        .expect(401);
    });

    it('should invalidate refresh token after password change', async () => {
      // Create a test user for this specific test
      const testUser = {
        login: 'passwordchangetest',
        password: 'testpass123',
      };

      await prismaService.user.create({
        data: {
          login: testUser.login,
          password: await bcrypt.hash(testUser.password, 10),
          displayName: 'Password Change Test',
          role: 'USER',
        },
      });

      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        });

      const accessToken = loginResponse.body.accessToken;
      const refreshToken = loginResponse.body.refreshToken;

      // Change password
      await request(app.getHttpServer())
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: testUser.password,
          newPassword: 'newpass456',
        })
        .expect(201);

      // Try to use old refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);

      // Clean up
      await prismaService.user.delete({
        where: { login: testUser.login },
      });
    });
  });

  describe('Profile update persistence', () => {
    it('should persist display name changes', async () => {
      const newDisplayName = 'Persistent Display Name';

      // Update display name
      await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: newDisplayName,
        })
        .expect(200);

      // Get profile again to verify persistence
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.displayName).toBe(newDisplayName);
    });
  });
});