import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { createTestingApp, createMockPrismaService } from './test-utils';
import { PrismaService } from '../src/database/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let prismaService: any;

  beforeAll(async () => {
    app = await createTestingApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      // Mock database query for health check
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('services');
          expect(res.body.services).toHaveProperty('database', 'up');
        });
    });

    it('should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });

    it('should return consistent status format', async () => {
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|error)$/),
        timestamp: expect.any(String),
        services: expect.any(Object),
      });
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return readiness status with database connected', async () => {
      // Mock successful database query
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database', 'up');
      expect(response.body).toHaveProperty('memory');
    });

    it('should include memory usage details', async () => {
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('memory');
      expect(response.body.memory).toHaveProperty('heapUsedMB');
      expect(response.body.memory).toHaveProperty('heapTotalMB');
      expect(response.body.memory).toHaveProperty('percentage');
    });

    it('should include timestamp', async () => {
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);
    });

    it('should handle database disconnection gracefully', async () => {
      // Mock database query failure
      prismaService.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);  // Still returns 200 but with different status

      expect(response.body).toHaveProperty('status', 'not ready');
      expect(response.body.services).toHaveProperty('database', 'down');
    });
  });
});