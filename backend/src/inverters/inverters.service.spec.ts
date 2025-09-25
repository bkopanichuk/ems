import { Test, TestingModule } from '@nestjs/testing';
import { InvertersService } from './inverters.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';

describe('InvertersService', () => {
  let service: InvertersService;
  let prismaService: PrismaService;

  const userId = 'user-123';
  const otherUserId = 'user-456';

  const mockInverter = {
    id: 'inverter-1',
    name: 'Test Inverter',
    chargeCapacity: 5000,
    dischargeCapacity: 4500,
    batteryCapacity: 10000,
    webUrl: 'http://192.168.1.100',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvertersService,
        {
          provide: PrismaService,
          useValue: {
            inverter: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InvertersService>(InvertersService);
    prismaService = module.get<PrismaService>(PrismaService);
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

      const expectedInverter = {
        ...mockInverter,
        ...createDto,
        id: 'inverter-new',
        userId,
      };

      jest
        .spyOn(prismaService.inverter, 'create')
        .mockResolvedValue(expectedInverter);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(expectedInverter);
      expect(prismaService.inverter.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          userId,
        },
      });
    });

    it('should create an inverter without webUrl', async () => {
      const createDto: CreateInverterDto = {
        name: 'Simple Inverter',
        chargeCapacity: 1000,
        dischargeCapacity: 900,
        batteryCapacity: 2000,
      };

      const expectedInverter = {
        ...mockInverter,
        ...createDto,
        webUrl: null,
        id: 'inverter-simple',
      };

      jest
        .spyOn(prismaService.inverter, 'create')
        .mockResolvedValue(expectedInverter);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(expectedInverter);
      expect(prismaService.inverter.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          userId,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all inverters for a user', async () => {
      jest
        .spyOn(prismaService.inverter, 'findMany')
        .mockResolvedValue(mockInverters);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockInverters);
      expect(prismaService.inverter.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no inverters', async () => {
      jest.spyOn(prismaService.inverter, 'findMany').mockResolvedValue([]);

      const result = await service.findAll('user-with-no-inverters');

      expect(result).toEqual([]);
      expect(prismaService.inverter.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-with-no-inverters' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an inverter if it belongs to the user', async () => {
      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(mockInverter);

      const result = await service.findOne(mockInverter.id, userId);

      expect(result).toEqual(mockInverter);
      expect(prismaService.inverter.findUnique).toHaveBeenCalledWith({
        where: { id: mockInverter.id },
      });
    });

    it('should throw NotFoundException if inverter does not exist', async () => {
      jest.spyOn(prismaService.inverter, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if inverter belongs to another user', async () => {
      const otherUserInverter = { ...mockInverter, userId: otherUserId };
      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(otherUserInverter);

      await expect(service.findOne(mockInverter.id, userId)).rejects.toThrow(
        ForbiddenException,
      );
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

      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(mockInverter);
      jest
        .spyOn(prismaService.inverter, 'update')
        .mockResolvedValue(updatedInverter);

      const result = await service.update(mockInverter.id, userId, updateDto);

      expect(result).toEqual(updatedInverter);
      expect(prismaService.inverter.update).toHaveBeenCalledWith({
        where: { id: mockInverter.id },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if inverter does not exist', async () => {
      jest.spyOn(prismaService.inverter, 'findUnique').mockResolvedValue(null);

      await expect(
        service.update('non-existent', userId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if inverter belongs to another user', async () => {
      const otherUserInverter = { ...mockInverter, userId: otherUserId };
      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(otherUserInverter);

      await expect(
        service.update(mockInverter.id, userId, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update only webUrl field', async () => {
      const updateDto: UpdateInverterDto = {
        webUrl: 'http://192.168.1.150',
      };

      const updatedInverter = {
        ...mockInverter,
        webUrl: updateDto.webUrl,
      };

      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(mockInverter);
      jest
        .spyOn(prismaService.inverter, 'update')
        .mockResolvedValue(updatedInverter);

      const result = await service.update(mockInverter.id, userId, updateDto);

      expect(result.webUrl).toBe(updateDto.webUrl);
      expect(prismaService.inverter.update).toHaveBeenCalledWith({
        where: { id: mockInverter.id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete an inverter', async () => {
      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(mockInverter);
      jest
        .spyOn(prismaService.inverter, 'delete')
        .mockResolvedValue(mockInverter);

      const result = await service.remove(mockInverter.id, userId);

      expect(result).toEqual(mockInverter);
      expect(prismaService.inverter.delete).toHaveBeenCalledWith({
        where: { id: mockInverter.id },
      });
    });

    it('should throw NotFoundException if inverter does not exist', async () => {
      jest.spyOn(prismaService.inverter, 'findUnique').mockResolvedValue(null);

      await expect(service.remove('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if inverter belongs to another user', async () => {
      const otherUserInverter = { ...mockInverter, userId: otherUserId };
      jest
        .spyOn(prismaService.inverter, 'findUnique')
        .mockResolvedValue(otherUserInverter);

      await expect(service.remove(mockInverter.id, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should not delete if findOne throws', async () => {
      jest.spyOn(prismaService.inverter, 'findUnique').mockResolvedValue(null);
      const deleteSpy = jest.spyOn(prismaService.inverter, 'delete');

      await expect(service.remove('non-existent', userId)).rejects.toThrow();
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
