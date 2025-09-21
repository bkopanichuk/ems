import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    login: 'testuser',
    password: 'testpass123',
    displayName: 'Test User',
    role: 'USER',
  };

  const adminUser = {
    login: 'admin',
    password: 'admin123',
    displayName: 'Admin User',
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

    // Create test users
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 10);

    await prismaService.user.create({
      data: {
        login: testUser.login,
        password: hashedPassword,
        displayName: testUser.displayName,
        role: 'USER',
      },
    });

    await prismaService.user.create({
      data: {
        login: adminUser.login,
        password: hashedAdminPassword,
        displayName: adminUser.displayName,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prismaService.auditLog.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.login).toBe(testUser.login);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'nonexistent',
          password: 'anypassword',
        })
        .expect(401);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('login should not be empty');
          expect(res.body.message).toContain('password should not be empty');
        });
    });

    it('should fail when user is blocked', async () => {
      // Block the user
      await prismaService.user.update({
        where: { login: testUser.login },
        data: { isBlocked: true },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        })
        .expect(401);

      // Unblock the user for other tests
      await prismaService.user.update({
        where: { login: testUser.login },
        data: { isBlocked: false },
      });
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        })
        .expect(201);

      const validRefreshToken = loginResponse.body.refreshToken;

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should fail with missing refresh token', () => {
      return request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    beforeEach(async () => {
      // Get fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        })
        .expect(201);

      accessToken = loginResponse.body.accessToken;
    });

    it('should get profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.login).toBe(testUser.login);
          expect(res.body.displayName).toBe(testUser.displayName);
          expect(res.body.role).toBe(testUser.role);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    beforeEach(async () => {
      // Get fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: testUser.login,
          password: testUser.password,
        })
        .expect(201);

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Try to use refresh token
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  describe('Account lockout', () => {
    const lockoutUser = {
      login: 'lockouttest',
      password: 'testpass123',
    };

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(lockoutUser.password, 10);
      await prismaService.user.create({
        data: {
          login: lockoutUser.login,
          password: hashedPassword,
          displayName: 'Lockout Test User',
          role: 'USER',
        },
      });
    });

    afterAll(async () => {
      await prismaService.user.delete({
        where: { login: lockoutUser.login },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            login: lockoutUser.login,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // Check that account is locked
      const user = await prismaService.user.findUnique({
        where: { login: lockoutUser.login },
      });

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil).toBeTruthy();

      // Verify login fails even with correct password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: lockoutUser.login,
          password: lockoutUser.password,
        })
        .expect(401);
    });
  });
});