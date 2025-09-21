import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when database is up', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          database: 'up',
        },
      });
    });

    it('should return error status when database is down', async () => {
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await controller.check();

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.any(String),
        services: {
          database: 'down',
        },
      });
    });

    it('should include timestamp in ISO format', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('ready', () => {
    it('should return ready status when database is connected', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await controller.ready();

      expect(result).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
        services: {
          database: 'up',
        },
        memory: {
          heapUsedMB: expect.any(Number),
          heapTotalMB: expect.any(Number),
          percentage: expect.any(Number),
        },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return not ready status when database is disconnected', async () => {
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await controller.ready();

      expect(result).toEqual({
        status: 'not ready',
        timestamp: expect.any(String),
        services: {
          database: 'down',
        },
      });
    });

    it('should include correct memory usage information', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Mock process.memoryUsage
      const mockMemoryUsage = {
        rss: 100000000,
        heapTotal: 50000000,
        heapUsed: 30000000,
        external: 1000000,
        arrayBuffers: 500000,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      const result = await controller.ready();

      expect(result.memory).toEqual({
        heapUsedMB: Math.round(mockMemoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mockMemoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((mockMemoryUsage.heapUsed / mockMemoryUsage.heapTotal) * 100),
      });
    });

    it('should calculate memory percentage correctly', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const mockMemoryUsage = {
        rss: 100000000,
        heapTotal: 100 * 1024 * 1024, // Exactly 100 MB
        heapUsed: 50 * 1024 * 1024, // Exactly 50 MB
        external: 1000000,
        arrayBuffers: 500000,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      const result = await controller.ready();

      // Should be exactly 50% when using exact MB values
      expect(result.memory.percentage).toBe(50);
      expect(result.memory.heapUsedMB).toBe(50);
      expect(result.memory.heapTotalMB).toBe(100);
    });
  });
});