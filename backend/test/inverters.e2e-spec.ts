import {
  INestApplication,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { createTestingApp } from './test-utils';
import { InvertersService } from '../src/inverters/inverters.service';

describe('Inverters (e2e)', () => {
  let app: INestApplication;
  let invertersService: any;

  const mockInverter = {
    id: 'inverter-1',
    name: 'Test Inverter',
    chargeCapacity: 5000,
    dischargeCapacity: 4500,
    batteryCapacity: 10000,
    webUrl: 'http://192.168.1.100',
    userId: 'test-user-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockInverters = [
    mockInverter,
    {
      ...mockInverter,
      id: 'inverter-2',
      name: 'Second Inverter',
      webUrl: null,
    },
  ];

  beforeAll(async () => {
    app = await createTestingApp();
    invertersService = app.get(InvertersService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/inverters (GET)', () => {
    it('should return list of user inverters', async () => {
      invertersService.findAll.mockResolvedValue(mockInverters);

      const response = await request(app.getHttpServer())
        .get('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'inverter-1',
            name: 'Test Inverter',
            chargeCapacity: 5000,
          }),
        ]),
      });
      expect(invertersService.findAll).toHaveBeenCalledWith('test-user-id');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/inverters').expect(401);
    });

    it('should return empty array when user has no inverters', async () => {
      invertersService.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: [],
      });
    });
  });

  describe('/inverters (POST)', () => {
    it('should create a new inverter', async () => {
      const createDto = {
        name: 'New Inverter',
        chargeCapacity: 3000,
        dischargeCapacity: 2500,
        batteryCapacity: 5000,
        webUrl: 'http://192.168.1.200',
      };

      const createdInverter = {
        ...createDto,
        id: 'new-inverter-id',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      invertersService.create.mockResolvedValue(createdInverter);

      const response = await request(app.getHttpServer())
        .post('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        data: expect.objectContaining({
          id: 'new-inverter-id',
          name: 'New Inverter',
          chargeCapacity: 3000,
        }),
        message: 'Инвертор успешно создан',
      });
      expect(invertersService.create).toHaveBeenCalledWith(
        'test-user-id',
        createDto,
      );
    });

    it('should create inverter without webUrl', async () => {
      const createDto = {
        name: 'Simple Inverter',
        chargeCapacity: 1000,
        dischargeCapacity: 900,
        batteryCapacity: 2000,
      };

      const createdInverter = {
        ...createDto,
        id: 'simple-inverter-id',
        userId: 'test-user-id',
        webUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      invertersService.create.mockResolvedValue(createdInverter);

      const response = await request(app.getHttpServer())
        .post('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(createDto)
        .expect(201);

      expect(response.body.data.webUrl).toBeNull();
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        name: 'Test',
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate numeric fields are positive', async () => {
      const invalidDto = {
        name: 'Test Inverter',
        chargeCapacity: -100,
        dischargeCapacity: 2500,
        batteryCapacity: 5000,
      };

      await request(app.getHttpServer())
        .post('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate webUrl format', async () => {
      const invalidDto = {
        name: 'Test Inverter',
        chargeCapacity: 1000,
        dischargeCapacity: 900,
        batteryCapacity: 2000,
        webUrl: 'invalid-url',
      };

      await request(app.getHttpServer())
        .post('/inverters')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/inverters/:id (GET)', () => {
    it('should return specific inverter', async () => {
      invertersService.findOne.mockResolvedValue(mockInverter);

      const response = await request(app.getHttpServer())
        .get('/inverters/inverter-1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: expect.objectContaining({
          id: 'inverter-1',
          name: 'Test Inverter',
        }),
      });
      expect(invertersService.findOne).toHaveBeenCalledWith(
        'inverter-1',
        'test-user-id',
      );
    });

    it('should handle not found error', async () => {
      invertersService.findOne.mockRejectedValue(
        new NotFoundException('Инвертор с ID non-existent не найден'),
      );

      await request(app.getHttpServer())
        .get('/inverters/non-existent')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });

    it('should handle forbidden error', async () => {
      invertersService.findOne.mockRejectedValue(
        new ForbiddenException('У вас нет доступа к этому инвертору'),
      );

      await request(app.getHttpServer())
        .get('/inverters/other-user-inverter')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(403);
    });
  });

  describe('/inverters/:id (PATCH)', () => {
    it('should update inverter', async () => {
      const updateDto = {
        name: 'Updated Inverter',
        chargeCapacity: 6000,
      };

      const updatedInverter = {
        ...mockInverter,
        ...updateDto,
      };

      invertersService.update.mockResolvedValue(updatedInverter);

      const response = await request(app.getHttpServer())
        .patch('/inverters/inverter-1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: expect.objectContaining({
          name: 'Updated Inverter',
          chargeCapacity: 6000,
        }),
        message: 'Инвертор успешно обновлен',
      });
      expect(invertersService.update).toHaveBeenCalledWith(
        'inverter-1',
        'test-user-id',
        updateDto,
      );
    });

    it('should allow partial updates', async () => {
      const updateDto = {
        webUrl: 'http://192.168.1.150',
      };

      const updatedInverter = {
        ...mockInverter,
        webUrl: updateDto.webUrl,
      };

      invertersService.update.mockResolvedValue(updatedInverter);

      const response = await request(app.getHttpServer())
        .patch('/inverters/inverter-1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.webUrl).toBe(updateDto.webUrl);
    });

    it('should validate update data', async () => {
      const invalidDto = {
        chargeCapacity: -500,
      };

      await request(app.getHttpServer())
        .patch('/inverters/inverter-1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should handle not found error', async () => {
      invertersService.update.mockRejectedValue(
        new NotFoundException('Инвертор с ID non-existent не найден'),
      );

      await request(app.getHttpServer())
        .patch('/inverters/non-existent')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('/inverters/:id (DELETE)', () => {
    it('should delete inverter', async () => {
      invertersService.remove.mockResolvedValue(mockInverter);

      const response = await request(app.getHttpServer())
        .delete('/inverters/inverter-1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: 'Инвертор успешно удален',
      });
      expect(invertersService.remove).toHaveBeenCalledWith(
        'inverter-1',
        'test-user-id',
      );
    });

    it('should handle not found error', async () => {
      invertersService.remove.mockRejectedValue(
        new NotFoundException('Инвертор с ID non-existent не найден'),
      );

      await request(app.getHttpServer())
        .delete('/inverters/non-existent')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });

    it('should handle forbidden error', async () => {
      invertersService.remove.mockRejectedValue(
        new ForbiddenException('У вас нет доступа к этому инвертору'),
      );

      await request(app.getHttpServer())
        .delete('/inverters/other-user-inverter')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete('/inverters/inverter-1')
        .expect(401);
    });
  });

  describe('Admin access', () => {
    it('admin should see all inverters', async () => {
      const adminInverters = [
        ...mockInverters,
        {
          ...mockInverter,
          id: 'inverter-3',
          userId: 'other-user-id',
          name: 'Other User Inverter',
        },
      ];

      invertersService.findAll.mockResolvedValue(adminInverters);

      const response = await request(app.getHttpServer())
        .get('/inverters')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(invertersService.findAll).toHaveBeenCalledWith('admin-user-id');
    });
  });
});
