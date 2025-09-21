import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database on module init', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database on module destroy', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
    });
  });

  describe('enableShutdownHooks', () => {
    it('should enable shutdown hooks', () => {
      const app = {
        close: jest.fn(),
      } as any;

      // Mock process.on
      const processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);

      service.enableShutdownHooks(app);

      expect(processOnSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));

      // Cleanup
      processOnSpy.mockRestore();
    });

    it('should close app on beforeExit event', async () => {
      const app = {
        close: jest.fn(),
      } as any;

      let beforeExitCallback: Function;
      jest.spyOn(process, 'on').mockImplementation((event: string, callback: Function) => {
        if (event === 'beforeExit') {
          beforeExitCallback = callback;
        }
        return process;
      });

      service.enableShutdownHooks(app);

      // Trigger the beforeExit callback
      await beforeExitCallback();

      expect(app.close).toHaveBeenCalled();
    });
  });
});