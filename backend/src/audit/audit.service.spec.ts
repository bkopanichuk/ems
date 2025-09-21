import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditAction } from './audit.service';
import { PrismaService } from '../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.LOGIN_SUCCESS,
        metadata: { login: 'testuser' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const expectedLog = {
        id: 'audit-1',
        ...logData,
        createdAt: new Date(),
      };

      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(expectedLog);

      await service.log(logData);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          action: AuditAction.LOGIN_SUCCESS,
          metadata: { login: 'testuser' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should handle optional fields', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.PASSWORD_CHANGED,
        metadata: {},
      };

      await service.log(logData);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          action: AuditAction.PASSWORD_CHANGED,
          metadata: {},
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'invalid_password' },
      };

      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw - audit logging failures shouldn't break the app
      await expect(service.log(logData)).resolves.not.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN_SUCCESS,
          metadata: {},
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: '1',
          action: AuditAction.LOGOUT,
          metadata: {},
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
        },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs({
        userId: '1',
        limit: 10,
      });

      expect(result).toEqual(mockLogs);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });
    });

    it('should retrieve audit logs by action', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.USER_CREATED,
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs({
        action: AuditAction.USER_CREATED,
        limit: 20,
      });

      expect(result).toEqual(mockLogs);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: AuditAction.USER_CREATED,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });
    });

    it('should retrieve audit logs within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAuditLogs({
        startDate,
        endDate,
        limit: 50,
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
    });

    it('should use default limit when not specified', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAuditLogs({});

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      const mockDeleteResult = { count: 150 };
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await service.cleanOldLogs(30);

      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify the date is approximately 30 days ago
      const deleteCall = (prismaService.auditLog.deleteMany as jest.Mock).mock.calls[0][0];
      const cutoffDate = deleteCall.where.createdAt.lt;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Allow for small time differences
      expect(Math.abs(cutoffDate.getTime() - expectedDate.getTime())).toBeLessThan(5000);

      expect(result).toEqual(mockDeleteResult);
    });

    it('should use default retention period of 90 days', async () => {
      const mockDeleteResult = { count: 50 };
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      await service.cleanOldLogs();

      const deleteCall = (prismaService.auditLog.deleteMany as jest.Mock).mock.calls[0][0];
      const cutoffDate = deleteCall.where.createdAt.lt;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 90);

      // Allow for small time differences
      expect(Math.abs(cutoffDate.getTime() - expectedDate.getTime())).toBeLessThan(5000);
    });

    it('should handle errors during cleanup', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.cleanOldLogs(30)).rejects.toThrow('Database error');
    });
  });
});