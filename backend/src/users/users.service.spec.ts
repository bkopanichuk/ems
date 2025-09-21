import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let auditService: AuditService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    password: 'hashedPassword',
    displayName: 'Test User',
    role: Role.USER,
    isBlocked: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: null,
    refreshTokenExpiresAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const mockAdmin = {
    ...mockUser,
    id: '2',
    login: 'admin',
    displayName: 'Admin User',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active users', async () => {
      const mockUsers = [mockUser, mockAdmin];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(
        mockUsers.map((user) => ({
          id: user.id,
          login: user.login,
          displayName: user.displayName,
          role: user.role,
          isBlocked: user.isBlocked,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
      );
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return empty array when no users exist', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto = {
        login: 'newuser',
        password: 'password123',
        displayName: 'New User',
        role: Role.USER,
      };
      const hashedPassword = 'hashedPassword123';
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...createDto,
        password: hashedPassword,
      });

      const result = await service.create(createDto, '2');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          login: 'newuser',
          password: hashedPassword,
          displayName: 'New User',
          role: Role.USER,
        },
        select: expect.any(Object),
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.USER_CREATED,
        metadata: { createdUserId: mockUser.id, login: 'newuser' },
      });
    });

    it('should throw ConflictException when login already exists', async () => {
      const createDto = {
        login: 'existinguser',
        password: 'password123',
        displayName: 'Existing User',
        role: Role.USER,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createDto, '2')).rejects.toThrow(ConflictException);
    });

    it('should allow creating user with previously deleted login', async () => {
      const createDto = {
        login: 'deleteduser',
        password: 'password123',
        displayName: 'Recreated User',
        role: Role.USER,
      };
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(deletedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...createDto,
      });

      const result = await service.create(createDto, '2');

      expect(result).toBeDefined();
      expect(prismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user displayName', async () => {
      const updateDto = { displayName: 'Updated Name' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        displayName: 'Updated Name',
      });

      const result = await service.update('1', updateDto, '2');

      expect(result.displayName).toBe('Updated Name');
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.USER_UPDATED,
        metadata: { updatedUserId: '1', changes: updateDto },
      });
    });

    it('should update user role', async () => {
      const updateDto = { role: Role.ADMIN };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });

      const result = await service.update('1', updateDto, '2');

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('999', { displayName: 'New Name' }, '2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not update deleted user', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      await expect(service.update('1', { displayName: 'New Name' }, '2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.remove('1', '2');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          deletedAt: expect.any(Date),
          refreshToken: null,
          refreshTokenExpiresAt: null,
        },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.USER_DELETED,
        metadata: { deletedUserId: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('999', '2')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete self', async () => {
      await expect(service.remove('1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to delete last admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      await expect(service.remove('2', '3')).rejects.toThrow(BadRequestException);
    });
  });

  describe('block', () => {
    it('should block user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        isBlocked: true,
      });

      await service.block('1', '2');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isBlocked: true,
          refreshToken: null,
          refreshTokenExpiresAt: null,
        },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.USER_BLOCKED,
        metadata: { blockedUserId: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.block('999', '2')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to block self', async () => {
      await expect(service.block('1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to block last admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      await expect(service.block('2', '3')).rejects.toThrow(BadRequestException);
    });
  });

  describe('unblock', () => {
    it('should unblock user', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(blockedUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...blockedUser,
        isBlocked: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      await service.unblock('1', '2');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isBlocked: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.USER_UNBLOCKED,
        metadata: { unblockedUserId: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.unblock('999', '2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });

      await service.assignRole('1', Role.ADMIN, '2');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: Role.ADMIN },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '2',
        action: AuditAction.ROLE_ASSIGNED,
        metadata: { targetUserId: '1', oldRole: Role.USER, newRole: Role.ADMIN },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.assignRole('999', Role.ADMIN, '2')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting last admin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      await expect(service.assignRole('2', Role.USER, '3')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByLogin', () => {
    it('should find user by login', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByLogin('testuser');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { login: 'testuser' },
      });
    });

    it('should return null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByLogin('nonexistent');

      expect(result).toBeNull();
    });
  });
});