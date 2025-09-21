import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
        });
    });

    it('should be accessible without authentication', () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });

    it('should return consistent status format', async () => {
      const response1 = await request(app.getHttpServer()).get('/health');
      const response2 = await request(app.getHttpServer()).get('/health');

      expect(response1.body.status).toBe('ok');
      expect(response2.body.status).toBe('ok');
      expect(Object.keys(response1.body)).toEqual(Object.keys(response2.body));
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return readiness status with database connected', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ready');
          expect(res.body).toHaveProperty('database', 'connected');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('memory');
        });
    });

    it('should include memory usage details', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.memory).toHaveProperty('rss');
          expect(res.body.memory).toHaveProperty('heapTotal');
          expect(res.body.memory).toHaveProperty('heapUsed');
          expect(res.body.memory).toHaveProperty('external');
          expect(typeof res.body.memory.rss).toBe('number');
          expect(typeof res.body.memory.heapTotal).toBe('number');
          expect(typeof res.body.memory.heapUsed).toBe('number');
          expect(typeof res.body.memory.external).toBe('number');
        });
    });

    it('should include uptime in seconds', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.uptime).toBe('number');
          expect(res.body.uptime).toBeGreaterThan(0);
        });
    });

    it('should be accessible without authentication', () => {
      return request(app.getHttpServer()).get('/health/ready').expect(200);
    });

    it('should handle database disconnection gracefully', async () => {
      // Mock database disconnection
      const originalQueryRaw = prismaService.$queryRaw;
      prismaService.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const response = await request(app.getHttpServer()).get('/health/ready').expect(200);

      expect(response.body).toHaveProperty('status', 'not ready');
      expect(response.body).toHaveProperty('database', 'disconnected');

      // Restore original function
      prismaService.$queryRaw = originalQueryRaw;
    });
  });

  describe('Health check monitoring', () => {
    it('should handle rapid successive requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app.getHttpServer()).get('/health'));
      }

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });

    it('should provide consistent readiness checks', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app.getHttpServer()).get('/health/ready'));
      }

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
        expect(response.body.database).toBe('connected');
      });
    });

    it('should track increasing uptime', async () => {
      const response1 = await request(app.getHttpServer()).get('/health/ready');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response2 = await request(app.getHttpServer()).get('/health/ready');

      expect(response2.body.uptime).toBeGreaterThan(response1.body.uptime);
    });
  });

  describe('Health check headers', () => {
    it('should return appropriate content-type', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);
    });

    it('should not require any specific headers', () => {
      return request(app.getHttpServer())
        .get('/health')
        .unset('User-Agent')
        .unset('Accept')
        .expect(200);
    });

    it('should handle OPTIONS request', () => {
      return request(app.getHttpServer()).options('/health').expect(200);
    });
  });
});