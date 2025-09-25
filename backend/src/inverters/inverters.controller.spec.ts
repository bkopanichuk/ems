import { Test, TestingModule } from '@nestjs/testing';
import { InvertersController } from './inverters.controller';
import { InvertersService } from './inverters.service';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('InvertersController', () => {
  let controller: InvertersController;
  let service: InvertersService;

  const mockRequest = {
    user: {
      userId: 'test-user-123',
      login: 'testuser',
      role: 'USER',
    },
  };

  const mockInverter = {
    id: 'inverter-1',
    name: 'Test Inverter',
    chargeCapacity: 5000,
    dischargeCapacity: 4500,
    batteryCapacity: 10000,
    webUrl: 'http://192.168.1.100',
    userId: mockRequest.user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInverters = [
    mockInverter,
    {
      ...mockInverter,
      id: 'inverter-2',
      name: 'Second Inverter',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvertersController],
      providers: [
        {
          provide: InvertersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvertersController>(InvertersController);
    service = module.get<InvertersService>(InvertersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new inverter', async () => {
      const createDto: CreateInverterDto = {
        name: 'New Inverter',
        chargeCapacity: 3000,
        dischargeCapacity: 2500,
        batteryCapacity: 5000,
        webUrl: 'http://192.168.1.200',
      };

      const createdInverter = {
        ...mockInverter,
        ...createDto,
        id: 'new-inverter',
      };

      jest.spyOn(service, 'create').mockResolvedValue(createdInverter);

      const result = await controller.create(
        mockRequest.user.userId,
        createDto,
      );

      expect(result).toEqual({
        status: 'success',
        data: createdInverter,
        message: 'Инвертор успешно создан',
      });
      expect(service.create).toHaveBeenCalledWith(
        mockRequest.user.userId,
        createDto,
      );
    });

    it('should handle service errors', async () => {
      const createDto: CreateInverterDto = {
        name: 'Test',
        chargeCapacity: 1000,
        dischargeCapacity: 900,
        batteryCapacity: 2000,
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        controller.create(mockRequest.user.userId, createDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all inverters for user', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockInverters);

      const result = await controller.findAll(mockRequest.user.userId);

      expect(result).toEqual({
        status: 'success',
        data: mockInverters,
      });
      expect(service.findAll).toHaveBeenCalledWith(mockRequest.user.userId);
    });

    it('should return empty array when no inverters', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll(mockRequest.user.userId);

      expect(result).toEqual({
        status: 'success',
        data: [],
      });
    });
  });

  describe('findOne', () => {
    it('should return a specific inverter', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInverter);

      const result = await controller.findOne(
        'inverter-1',
        mockRequest.user.userId,
      );

      expect(result).toEqual({
        status: 'success',
        data: mockInverter,
      });
      expect(service.findOne).toHaveBeenCalledWith(
        'inverter-1',
        mockRequest.user.userId,
      );
    });

    it('should handle not found error', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Инвертор не найден'));

      await expect(
        controller.findOne('non-existent', mockRequest.user.userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle forbidden error', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(
          new ForbiddenException('У вас нет доступа к этому инвертору'),
        );

      await expect(
        controller.findOne('other-user-inverter', mockRequest.user.userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update an inverter', async () => {
      const updateDto: UpdateInverterDto = {
        name: 'Updated Inverter',
        chargeCapacity: 6000,
      };

      const updatedInverter = {
        ...mockInverter,
        ...updateDto,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedInverter);

      const result = await controller.update(
        'inverter-1',
        mockRequest.user.userId,
        updateDto,
      );

      expect(result).toEqual({
        status: 'success',
        data: updatedInverter,
        message: 'Инвертор успешно обновлен',
      });
      expect(service.update).toHaveBeenCalledWith(
        'inverter-1',
        mockRequest.user.userId,
        updateDto,
      );
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateInverterDto = {
        webUrl: 'http://192.168.1.150',
      };

      const updatedInverter = {
        ...mockInverter,
        webUrl: updateDto.webUrl,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedInverter);

      const result = await controller.update(
        'inverter-1',
        mockRequest.user.userId,
        updateDto,
      );

      expect(result.data.webUrl).toBe(updateDto.webUrl);
    });

    it('should handle service errors', async () => {
      const updateDto: UpdateInverterDto = { name: 'Test' };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new NotFoundException('Инвертор не найден'));

      await expect(
        controller.update('non-existent', mockRequest.user.userId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an inverter', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockInverter);

      const result = await controller.remove(
        'inverter-1',
        mockRequest.user.userId,
      );

      expect(result).toEqual({
        status: 'success',
        message: 'Инвертор успешно удален',
      });
      expect(service.remove).toHaveBeenCalledWith(
        'inverter-1',
        mockRequest.user.userId,
      );
    });

    it('should handle not found error', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new NotFoundException('Инвертор не найден'));

      await expect(
        controller.remove('non-existent', mockRequest.user.userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle forbidden error', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(
          new ForbiddenException('У вас нет доступа к этому инвертору'),
        );

      await expect(
        controller.remove('other-user-inverter', mockRequest.user.userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Response formatting', () => {
    it('should format success response with data', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInverter);

      const result = await controller.findOne(
        'inverter-1',
        mockRequest.user.userId,
      );

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockInverter);
    });

    it('should include message in create response', async () => {
      const createDto: CreateInverterDto = {
        name: 'Test',
        chargeCapacity: 1000,
        dischargeCapacity: 900,
        batteryCapacity: 2000,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockInverter);

      const result = await controller.create(
        mockRequest.user.userId,
        createDto,
      );

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('message', 'Инвертор успешно создан');
      expect(result).toHaveProperty('data');
    });

    it('should include message in update response', async () => {
      const updateDto: UpdateInverterDto = { name: 'Updated' };

      jest.spyOn(service, 'update').mockResolvedValue(mockInverter);

      const result = await controller.update(
        'inverter-1',
        mockRequest.user.userId,
        updateDto,
      );

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('message', 'Инвертор успешно обновлен');
      expect(result).toHaveProperty('data');
    });

    it('should include message in delete response', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockInverter);

      const result = await controller.remove(
        'inverter-1',
        mockRequest.user.userId,
      );

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('message', 'Инвертор успешно удален');
      expect(result).not.toHaveProperty('data');
    });
  });
});
